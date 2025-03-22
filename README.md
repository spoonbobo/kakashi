# Kakashi
Kakashi (光說不做) is a go-to chatroom application for you to collaborate with your team and AI agents, integrated with task system, knowledge base, under MCP protocols.

Kakashi is under rapid development, welcome to contribute.

## Features
- All-in-one MCP stack with easy-to-use client & servers
- Intelligent task system based on chatroom's context
- Task management with approval system
- Knowledge base integrated
- Support multiple languages

## Setup
```bash
cp public/.env.template public/.env
docker compose up

# in other terminal
docker exec -it kakashi-llm bash
ollama pull gemma3:4b
ollama pull llama3.2:latest
```

Only Ollama is supported now for LLM service. Roadmap is to support more LLM services.

Visit `kakashi-dev.com` to open the web application.
Login with default account: ID `admin` and password `admin1234`.

## Supported MCP Servers
* weather
* download from web