# Email Password Auth

MYTax needs a normal account flow before paid credits are useful. Customers register or sign in with only an email and password. The Supabase user id remains the account key for credit balances, Stripe checkout metadata, and webhook credit grants.

The header auth control provides sign in and create account modes. Sign in uses Supabase `signInWithPassword`. Create account uses Supabase `signUp`. Existing database triggers create the profile and credit balance when Supabase creates the user.

