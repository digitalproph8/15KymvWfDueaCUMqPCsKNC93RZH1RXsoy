/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {marked} from 'marked';
import OpenAI from 'openai';

// Ensure we use the correct environment variable for the API key as per guidelines.
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  dangerouslyAllowBrowser: true,
});

// Define available models
const MODELS = [
  { id: 'models/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'models/gemini-3-pro-preview', name: 'Gemini 3 Pro' },
  { id: 'models/gemini-2.5-flash-lite-latest', name: 'Gemini Flash Lite' },
  { id: 'models/gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
];

// Initialize UI
const root = document.getElementById('root');
if (root) {
  root.innerHTML = `
    <header>
      <h1>Gemini Chat</h1>
      <div class="controls">
        <select id="model-select" aria-label="Select Model">
          ${MODELS.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
        </select>
      </div>
    </header>
    <div id="chat-history" role="log" aria-live="polite">
      <!-- Messages will appear here -->
    </div>
    <form id="chat-form">
      <input type="text" id="prompt-input" placeholder="Type your message..." autocomplete="off" aria-label="Message input" />
      <button type="submit" id="send-btn">Send</button>
    </form>
  `;
}

// Elements
const chatHistory = document.getElementById('chat-history') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

// State
let messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
  {role: 'system', content: 'You are a helpful assistant.'},
];

// Initial System Message
appendMessage('system', 'System: You are a helpful assistant.');

/**
 * Appends a message to the chat history.
 */
async function appendMessage(role: 'user' | 'assistant' | 'system' | 'error', text: string) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  
  if (role === 'assistant' || role === 'system') {
    // Render Markdown for assistant/system responses
    try {
      const parsed = await marked.parse(text);
      contentDiv.innerHTML = parsed;
    } catch (e) {
      contentDiv.textContent = text;
    }
  } else {
    contentDiv.textContent = text;
  }
  
  msgDiv.appendChild(contentDiv);
  chatHistory.appendChild(msgDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Handles form submission.
 */
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = promptInput.value.trim();
  if (!text) return;

  // UI State: Loading
  promptInput.value = '';
  promptInput.disabled = true;
  sendBtn.disabled = true;
  modelSelect.disabled = true;
  
  // Add user message to UI and history
  await appendMessage('user', text);
  messages.push({role: 'user', content: text});

  try {
    const selectedModel = modelSelect.value;
    
    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: messages as any,
    });

    const responseText = completion.choices[0].message.content || 'No response generated.';
    
    // Add assistant response to UI and history
    await appendMessage('assistant', responseText);
    messages.push({role: 'assistant', content: responseText});

  } catch (error: any) {
    console.error(error);
    await appendMessage('error', `Error: ${error.message || 'Unknown error occurred'}`);
  } finally {
    // UI State: Ready
    promptInput.disabled = false;
    sendBtn.disabled = false;
    modelSelect.disabled = false;
    promptInput.focus();
  }
});
