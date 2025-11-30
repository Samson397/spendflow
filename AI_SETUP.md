# AI Assistant Setup Guide

The SpendFlow app includes an AI assistant powered by DeepSeek API. To enable this feature, you need to configure your API key.

## Quick Setup

1. **Get a DeepSeek API Key**
   - Go to [DeepSeek Platform](https://platform.deepseek.com/)
   - Sign up for an account
   - Navigate to API Keys section
   - Create a new API key

2. **Configure the App**
   - Open the `.env` file in the root of your project
   - Replace `your_deepseek_api_key_here` with your actual API key:
   ```
   DEEPSEEK_API_KEY=sk-your-actual-api-key-here
   ```

3. **Restart the App**
   - Stop the development server
   - Restart with `npm start` or `expo start`

## Troubleshooting

### Error: "API request failed: 401"
- **Cause**: Invalid or missing API key
- **Solution**: Verify your API key is correct and properly configured in `.env`

### Error: "AI Service is not configured"
- **Cause**: API key is missing or still set to placeholder value
- **Solution**: Add a valid DeepSeek API key to your `.env` file

### Error: "API rate limit exceeded"
- **Cause**: Too many requests to DeepSeek API
- **Solution**: Wait a few minutes and try again

## Features

Once configured, the AI assistant can:
- Answer questions about your spending patterns
- Provide financial insights based on your data
- Help you understand your direct debits and subscriptions
- Analyze your transactions and categories
- Give personalized budget recommendations

## Security Notes

- The API key is stored in environment variables and is not exposed to the browser
- DeepSeek API calls are made client-side for real-time responses
- Your financial data is processed locally before being sent to the AI service

## Cost Considerations

DeepSeek API usage is billed per token. Typical usage:
- Simple questions: ~100-200 tokens
- Complex analysis: ~500-1000 tokens
- Check DeepSeek pricing for current rates

## Need Help?

If you encounter issues:
1. Verify your API key is correct
2. Check the console for detailed error messages
3. Ensure your .env file is properly formatted
4. Contact support if problems persist
