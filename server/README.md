# Server Configuration

This document outlines the necessary configuration for the server, primarily focusing on environment variables.

## OpenAI Integration (Azure)

The server integrates with Azure OpenAI for its AI capabilities. To enable this, you need to set up the following environment variables. Create a `.env` file in the `server` directory (`server/.env`) with the following content:

```
AZURE_OPENAI_API_KEY="your_azure_openai_api_key"
AZURE_OPENAI_API_ENDPOINT="your_azure_openai_base_endpoint"
AZURE_OPENAI_DEPLOYMENT_NAME="your_azure_openai_deployment_name"
AZURE_OPENAI_API_VERSION="your_azure_openai_api_version"
```

**Example:**

```
AZURE_OPENAI_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
AZURE_OPENAI_API_ENDPOINT="https://your-resource-name.openai.azure.com"
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"
AZURE_OPENAI_API_VERSION="2025-01-01-preview"
```

**Note:** The `server/.env` file is included in `.gitignore` and should not be committed to the repository.
