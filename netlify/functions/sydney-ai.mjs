import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Received Sydney AI request');
    
    const body = JSON.parse(event.body || '{}');
    const { question, context } = body;
    
    if (!question) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Question is required' }),
      };
    }

    // Get AI API configuration from Supabase
    const { data: aiConfig, error: configError } = await supabase
      .from('ai_config')
      .select('api_key, model_provider, model_name')
      .single();

    if (configError || !aiConfig?.api_key) {
      console.error('AI configuration not found:', configError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'AI service not configured. Please contact your administrator.',
          details: 'Missing API configuration'
        }),
      };
    }

    // Build context prompt for the AI
    const contextPrompt = buildContextPrompt(context, question);
    
    // Call the appropriate AI service
    let response;
    if (aiConfig.model_provider === 'openai') {
      response = await callOpenAI(aiConfig.api_key, aiConfig.model_name || 'gpt-4o-mini', contextPrompt);
    } else if (aiConfig.model_provider === 'anthropic') {
      response = await callAnthropic(aiConfig.api_key, aiConfig.model_name || 'claude-3-sonnet-20240229', contextPrompt);
    } else {
      throw new Error(`Unsupported model provider: ${aiConfig.model_provider}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response }),
    };

  } catch (error) {
    console.error('Error in Sydney AI function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'I apologize, but I encountered an error while processing your request. Please try again later.',
        details: error.message
      }),
    };
  }
};

function buildContextPrompt(context, question) {
  const systemPrompt = `You are Sydney, an expert AI accounting assistant for Junyper, a modern accounting platform. You are knowledgeable, helpful, and speak in a professional yet friendly tone.

Your primary role is to help users with:
- Financial analysis and insights
- Accounting best practices and guidance
- Transaction categorization and reconciliation
- Business performance interpretation
- Invoice and payment management
- Cash flow analysis
- Tax preparation guidance
- Financial reporting explanations

IMPORTANT GUIDELINES:
- Always provide accurate, helpful accounting advice
- If you're unsure about specific regulations, recommend consulting a certified accountant
- Be concise but thorough in your explanations
- Use the user's business context to personalize your responses
- Never provide specific tax or legal advice - always recommend professional consultation for complex matters
- Focus on actionable insights and practical guidance

Current user business context:${context ? `
- Company: ${context.company}
- Industry: ${context.industry}
- Connected Accounts: ${context.accountsSummary}
- Recent Activity: ${context.recentActivity}
- Invoice Count: ${context.invoiceCount}
- Customer Count: ${context.customerCount}
- Total Revenue: $${context.totalRevenue}` : ' Limited context available'}

Respond to the user's question with helpful, practical accounting guidance.`;

  return {
    system: systemPrompt,
    user: question
  };
}

async function callOpenAI(apiKey, model, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey, model, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 1000,
      system: prompt.system,
      messages: [
        { role: 'user', content: prompt.user }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.content[0].text;
} 