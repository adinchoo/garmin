Deploy your existing tested analyze-health and analyze-meal functions here. The frontend calls the same function names and is backward compatible with the previous package.


## Eating-pattern AI coach

Deploy `analyze-eating-pattern` with the Supabase CLI after linking the project:

```sh
supabase functions deploy analyze-eating-pattern
```

Configure `GEMINI_API_KEY` as a Supabase Function secret (do not put it in browser code):

```sh
supabase secrets set GEMINI_API_KEY=your_key_here
```

The function authenticates the signed-in user and reads only that user's recent `meals` rows. The Fuel page falls back to transparent local diary-based suggestions if the AI function is not deployed or its provider is unavailable.
