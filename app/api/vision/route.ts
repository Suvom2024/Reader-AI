import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();
export async function POST(request: Request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const { image64, additionalInfo } = await request.json();
  let promptMessage = "Describe this image for me.";
  if (additionalInfo) {
    promptMessage = `Explain only the part of the image in details that is close to the following information: ${additionalInfo} with proper formatting. Do not describe the entire image or any other details.`;
  }

  const chatCompletion = await openai.chat.completions.create({
    messages: [{
      role: "user",
      // @ts-ignore
      content: [
        promptMessage,
        { image: image64, resize: 768 }
      ],
    }],
    model: "gpt-4-vision-preview",
    stream: true,
    max_tokens: 500,
  });

  const stream = OpenAIStream(chatCompletion);
  return new StreamingTextResponse(stream);
}
