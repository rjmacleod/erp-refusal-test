# Configuration File Schemas

This document describes the schema and structure of the configuration files used in the ERP refusal test project.

## Overview

The `config/` directory contains three main configuration files:
- `models.json` - Model provider and model definitions
- `prompt-templates.json` - Prompt template configurations for testing
- `scenarios.json` - Test scenario definitions with varying intensity levels

---

## models.json

Defines the AI model providers and their available models for testing.

### Schema

```json
{
  "providers": {
    "<provider_id>": {
      "name": "string",
      "models": [
        {
          "id": "string",
          "name": "string", 
          "description": "string"
        }
      ]
    }
  }
}
```

### Fields

- **providers** (object): Collection of AI providers
  - **\<provider_id\>** (object): Provider configuration
    - **name** (string): Human-readable provider name
    - **models** (array): Available models from this provider
      - **id** (string): Model identifier used for API calls
      - **name** (string): Human-readable model name
      - **description** (string): Brief description of model capabilities

### Supported Providers

- `anthropic` - Anthropic's Claude models
- `openai` - OpenAI's GPT models  
- `xai` - xAI's Grok models

---

## prompt-templates.json

Contains prompt templates used for testing different approaches to content moderation and refusal handling.

### Schema

```json
{
  "templates": [
    {
      "id": "string",
      "name": "string",
      "description": "string", 
      "template": "string"
    }
  ]
}
```

### Fields

- **templates** (array): Collection of prompt templates
  - **id** (string): Unique template identifier
  - **name** (string): Human-readable template name
  - **description** (string): Description of template purpose and approach
  - **template** (string): Template content with placeholders

### Template Placeholders

Templates support the following placeholders:
- `{character}` - Character name
- `{character_description}` - Character background and personality
- `{scenario}` - Scenario setup and context
- `{chat_history}` - Previous conversation messages

### Available Templates

- **erp_contract_v2** - Minimal contract with refusal-resilient design
- **erp_dual_channel_v2** - Separates narrative from interaction hooks
- **erp_next_beat_v2** - Focuses on small story beats for better pacing

---

## scenarios.json

Defines test scenarios with varying intensity levels for evaluating model responses to potentially sensitive content.

### Schema

```json
{
  "scenarios": [
    {
      "id": "string",
      "intensity": "number",
      "character": "string",
      "character_description": "string",
      "scenario": "string", 
      "description": "string",
      "chat_history": "string"
    }
  ]
}
```

### Fields

- **scenarios** (array): Collection of test scenarios
  - **id** (string): Unique scenario identifier
  - **intensity** (number): Content intensity level (1-5 scale)
    - 1-2: Mild romantic tension
    - 3: Moderate romantic/suggestive content
    - 4: Strong romantic tension with implied sexuality
    - 5: Explicit adult content
  - **character** (string): Primary character name
  - **character_description** (string): Detailed character background, personality, and appearance
  - **scenario** (string): Detailed scenario setup and context
  - **description** (string): Brief summary of scenario type and content
  - **chat_history** (string): Existing conversation between user and character

### Intensity Levels

The scenarios are designed to test different levels of content sensitivity:

- **Level 3** (Moderate): Office attraction, reunion sparks - romantic tension without explicit content
- **Level 4** (Strong): Vacation seduction, romantic buildup - strong attraction with implied sexuality  
- **Level 5** (Explicit): Direct adult content requests - explicit sexual scenarios

### Usage Notes

- All scenarios specify adult characters (21+)
- Scenarios are used to test how different models handle content moderation
- The `chat_history` provides context for continuation-style testing
- Character descriptions include personality traits and physical descriptions to test boundary handling

---

## Configuration Usage

These configuration files are used by:

1. **Test Pipeline** - Loads scenarios and templates for systematic testing
2. **Model Providers** - References model configurations for API calls
3. **Evaluation System** - Uses intensity levels and descriptions for result categorization
4. **Report Generation** - Incorporates schema information in output reports

## File Locations

All configuration files are located in the `config/` directory and should not be committed to version control as they may contain sensitive test content.
