"""
QLoRA Fine-tuning Script for MYTax Gemma 4 12B

This script fine-tunes Google Gemma 4 12B on Malaysia tax Q&A data using QLoRA (4-bit).
After training, exports to GGUF format for use with Ollama.

Requirements:
  pip install unsloth transformers datasets trl peft bitsandbytes

Hardware:
  - Minimum: NVIDIA GPU with 12GB VRAM (e.g., RTX 3060 12GB, T4)
  - Recommended: 16GB+ VRAM (RTX 4070, A100)
  - Google Colab free T4 (15GB) works

Usage:
  python training-data/scripts/finetune-qlora.py

  # Or on Google Colab:
  # 1. Upload merged.jsonl to Colab
  # 2. pip install unsloth
  # 3. Run this script
  # 4. Download the GGUF file
"""
import os
import json
import sys

# ============================================================
# Config
# ============================================================
BASE_MODEL = "google/gemma-3-12b-it"  # Gemma 3 12B instruction-tuned
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "processed", "merged.jsonl")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output")
GGUF_OUTPUT = os.path.join(OUTPUT_DIR, "mytax-gemma-12b-q4_k_m.gguf")

# QLoRA hyperparameters
LORA_R = 16            # LoRA rank
LORA_ALPHA = 32        # LoRA alpha
LORA_DROPOUT = 0.05    # LoRA dropout
MAX_SEQ_LENGTH = 2048  # Max sequence length
BATCH_SIZE = 2         # Per-device batch size (reduce if OOM)
GRAD_ACCUM = 4         # Gradient accumulation steps (effective batch = 8)
LEARNING_RATE = 2e-4   # Learning rate
NUM_EPOCHS = 3         # Number of training epochs
WARMUP_RATIO = 0.1     # Warmup ratio
WEIGHT_DECAY = 0.01    # Weight decay

# System prompt embedded in training
SYSTEM_PROMPT = """You are MYTax AI, a Malaysia tax expert assistant for YA2025.
You answer questions about Malaysian taxation accurately and concisely.
You can respond in English, Chinese, or Malay. Add disclaimers when appropriate."""


def load_dataset_from_jsonl(path: str):
    """Load JSONL training data and format for instruction tuning."""
    examples = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            msgs = obj.get("messages", [])
            if len(msgs) >= 2:
                user_msg = msgs[0]["content"]
                assistant_msg = msgs[1]["content"]
                # Format as chat template
                examples.append({
                    "conversations": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg},
                        {"role": "assistant", "content": assistant_msg},
                    ]
                })
    return examples


def main():
    print("=" * 60)
    print("MYTax QLoRA Fine-tuning")
    print("=" * 60)

    # Check GPU
    try:
        import torch
        if not torch.cuda.is_available():
            print("ERROR: CUDA GPU not available. Fine-tuning requires a GPU.")
            print("Consider using Google Colab (free T4 GPU).")
            sys.exit(1)
        gpu_name = torch.cuda.get_device_name(0)
        gpu_mem = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"GPU: {gpu_name} ({gpu_mem:.1f} GB)")
        if gpu_mem < 10:
            print(f"WARNING: {gpu_mem:.1f}GB VRAM may be insufficient for 12B model.")
            print("Consider using a smaller model or Google Colab.")
    except ImportError:
        print("ERROR: PyTorch not installed. pip install torch")
        sys.exit(1)

    # Load dataset
    print(f"\nLoading dataset: {DATASET_PATH}")
    examples = load_dataset_from_jsonl(DATASET_PATH)
    print(f"Loaded {len(examples)} training examples")

    if len(examples) < 10:
        print("ERROR: Too few examples for fine-tuning")
        sys.exit(1)

    # Import Unsloth
    print("\nInitializing model with Unsloth...")
    try:
        from unsloth import FastModel
    except ImportError:
        print("ERROR: Unsloth not installed.")
        print("Install: pip install unsloth")
        print("Or on Colab: pip install unsloth[colab]")
        sys.exit(1)

    # Load model with 4-bit quantization
    model, tokenizer = FastModel.from_pretrained(
        model_name=BASE_MODEL,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=True,
    )

    # Apply LoRA adapters
    model = FastModel.get_peft_model(
        model,
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
    )

    # Print trainable parameters
    model.print_trainable_parameters()

    # Prepare dataset
    from datasets import Dataset

    dataset = Dataset.from_list(examples)

    def format_chat(example):
        text = tokenizer.apply_chat_template(
            example["conversations"],
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text}

    dataset = dataset.map(format_chat, remove_columns=["conversations"])
    print(f"\nDataset prepared: {len(dataset)} examples")
    print(f"Sample (first 200 chars): {dataset[0]['text'][:200]}...")

    # Training
    from trl import SFTTrainer
    from transformers import TrainingArguments

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM,
        learning_rate=LEARNING_RATE,
        num_train_epochs=NUM_EPOCHS,
        warmup_ratio=WARMUP_RATIO,
        weight_decay=WEIGHT_DECAY,
        fp16=True,
        logging_steps=10,
        save_strategy="epoch",
        optim="adamw_8bit",
        seed=42,
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=training_args,
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LENGTH,
    )

    print("\n" + "=" * 60)
    print("Starting training...")
    print(f"  Epochs: {NUM_EPOCHS}")
    print(f"  Batch size: {BATCH_SIZE} x {GRAD_ACCUM} = {BATCH_SIZE * GRAD_ACCUM}")
    print(f"  Learning rate: {LEARNING_RATE}")
    print(f"  LoRA rank: {LORA_R}")
    print("=" * 60)

    trainer.train()

    # Save LoRA adapter
    adapter_path = os.path.join(OUTPUT_DIR, "lora-adapter")
    model.save_pretrained(adapter_path)
    tokenizer.save_pretrained(adapter_path)
    print(f"\nLoRA adapter saved to: {adapter_path}")

    # Export to GGUF for Ollama
    print("\nExporting to GGUF format...")
    model.save_pretrained_gguf(
        OUTPUT_DIR,
        tokenizer,
        quantization_method="q4_k_m",
    )
    print(f"GGUF saved to: {OUTPUT_DIR}")

    # Generate Ollama Modelfile
    modelfile_path = os.path.join(OUTPUT_DIR, "Modelfile")
    gguf_files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith(".gguf")]
    if gguf_files:
        gguf_name = gguf_files[0]
        with open(modelfile_path, "w", encoding="utf-8") as f:
            f.write(f'FROM ./{gguf_name}\n\n')
            f.write(f'SYSTEM """{SYSTEM_PROMPT}"""\n\n')
            f.write('PARAMETER temperature 0.7\n')
            f.write('PARAMETER top_p 0.9\n')
            f.write('PARAMETER num_ctx 4096\n')
        print(f"Modelfile created: {modelfile_path}")

    print("\n" + "=" * 60)
    print("FINE-TUNING COMPLETE!")
    print("=" * 60)
    print(f"\nTo use with Ollama:")
    print(f"  cd {OUTPUT_DIR}")
    print(f"  ollama create mytax-gemma4-finetuned -f Modelfile")
    print(f"  ollama run mytax-gemma4-finetuned")


if __name__ == "__main__":
    main()
