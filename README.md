# CodeCraft AI

🚀 **AI-powered development assistant that creates complete applications from natural language descriptions.**

Turn "create a todo app" into a fully working HTML/CSS/JS application with proper file structure - all automatically generated by Google's Gemini 2.0 Flash.

## Features

- **Natural Language → Full Apps**: Describe what you want, get complete working applications
- **Smart Project Structure**: Automatically organizes files and folders
- **Autonomous Development**: Plans, creates, and implements without manual intervention
- **Command Execution**: Runs system commands for advanced project setup

## Quick Start

**Create .env file:**

```bash
GEMINI_API_KEY=your_api_key
```

```bash
bun install

bun dev
```

## Example

**Input:** `"create a todo app with HTML CSS and JS"`

**Output:** Complete todo application with:

- Organized folder structure
- Semantic HTML
- Modern CSS styling
- Working JavaScript functionality

## Available Tools

- `executeCommand()` - **Core project creation tool** - Creates folders, files, writes code, and handles all project setup
- `getWeatherInfo()` - Get weather data for applications
- **Extensible** - Easy to add new development tools

Going to add more tools
