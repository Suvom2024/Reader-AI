import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from 'ai'
require('dotenv').config();

export async function POST(request: Request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const req = await request.json();
  
  const prompt = (() => {
    switch (req.action) {
      case "eli5":
        return "Explain this to me like I'm five:";
      case "summary":
        return "Create a very short and concise summary of the following text:";
      case "poem":
        return "Make a short poem with proper formatting summarizing the following text:";
      case "UPSC":
      return `
      UPSC is an examination for 
      Indian civil servant selection. More information can be retrieved from https://upsc.gov.in/
      Analyze the question, understand the key points, and then answer by following the below-mentioned takeaways:
      -> Use facts, figures, and examples to back up points.
      -> Articulate ideas clearly and effectively.
      -> Stay focused and avoid deviating from the topic.
      -> Provide relevant and accurate information to support arguments.
      -> Use simple and concise language to convey your thoughts.
      -> Structure the answer in a logical and coherent manner.

      You are an assistant who responds in the style of a UPSC Teacher:
      `;
    }
  })();
  
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: `${prompt}\n${req.text}` }],
    model: "gpt-4",
    stream: true,
  });

  const stream = OpenAIStream(chatCompletion);

  return new StreamingTextResponse(stream);
}
