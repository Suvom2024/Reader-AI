import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
export async function POST(request: Request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const { image64, additionalInfo } = await request.json();

  // Check if image64 is a URL
  let base64Image;
  if (image64.startsWith('http://') || image64.startsWith('https://')) {
    // Fetch the image from the URL and convert it to base64
    const response = await fetch(image64);
    const buffer = await response.buffer();
    base64Image = buffer.toString('base64');
  } else {
    // Assume image64 is already a base64 string
    base64Image = image64;
  }

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
        { image: base64Image, resize: 768 }
      ],
    }],
    model: "gpt-4-vision-preview",
    stream: true,
    max_tokens: 500,
  });

  const stream = OpenAIStream(chatCompletion);
  return new StreamingTextResponse(stream);
}



// import { OpenAIStream, StreamingTextResponse } from "ai";
// import OpenAI from "openai";
// import dotenv from 'dotenv';
// import { bucket } from '@/lib/firebaseAdmin';

// dotenv.config();
// export async function POST(request: Request) {
//   const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });

//   const { additionalInfo } = await request.json();
//   const filename = 'snip_me.png';
//   const file = bucket.file(filename);
//   const [buffer] = await file.download();

//   // Convert the buffer to a base64 string
//   const image64 = buffer.toString('base64');

//   // Log the base64 string to debug
//   console.log('Base64 Image:', image64);

//   let promptMessage = "Describe this image for me.";
//   if (additionalInfo) {
//     promptMessage = `Explain only the part of the image in details that is close to the following information: ${additionalInfo} with proper formatting. Do not describe the entire image or any other details.`;
//   }

//   const chatCompletion = await openai.chat.completions.create({
//     messages: [{
//       role: "user",
//       // @ts-ignore
//       content: [
//         promptMessage,
//         { image: image64, resize: 768 }
//       ],
//     }],
//     model: "gpt-4-vision-preview",
//     stream: true,
//     max_tokens: 500,
//   });

//   // Log the chat completion response to debug
//   console.log('Chat Completion:', chatCompletion);

//   const stream = OpenAIStream(chatCompletion);
//   return new StreamingTextResponse(stream);
// }
