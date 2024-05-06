// import Groq from "groq-sdk";
// import dotenv from 'dotenv';
// dotenv.config();

// export async function POST(request: Request) {
//   const groq = new Groq({
//     apiKey: process.env.GROQ_API_KEY,
//   });

//   const req = await request.json();

//   const prompt = (() => {
//     switch (req.action) {
//       case "eli5":
//         return "Explain this to me like I'm five:";
//       case "summary":
//         return "Create a very short and concise summary of the following text:";
//       case "poem":
//         return "Make a short poem with proper formatting summarizing the following text:";
//       case "UPSC":
//       return `
//       UPSC is an examination for 
//       Indian civil servant selection. More information can be retrieved from https://upsc.gov.in/
//       Analyze the question, understand the key points, and then answer by following the below-mentioned takeaways:
//       -> Use facts, figures, and examples to back up points.
//       -> Articulate ideas clearly and effectively.
//       -> Stay focused and avoid deviating from the topic.
//       -> Provide relevant and accurate information to support arguments.
//       -> Use simple and concise language to convey your thoughts.
//       -> Structure the answer in a logical and coherent manner.

//       You are an assistant who responds in the style of a UPSC Teacher:
//       `;
//     }
//   })();

//   const chatCompletion = await getGroqChatCompletion(groq, `${prompt}\n${req.text}`);

//   // Remove newlines and other formatting from the response
//   const cleanResponse = chatCompletion.choices[0]?.message?.content.replace(/\n/g, " ").trim();

//   // Send back just the string response
//   return new Response(cleanResponse, {
//     status: 200,
//     headers: {
//       'Content-Type': 'text/plain'
//     }
//   });
// }

// async function getGroqChatCompletion(groq: Groq, content: string) {
//   return groq.chat.completions.create({
//     messages: [{ role: "user", content }],
//     model: "mixtral-8x7b-32768"
//   });
// }


import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from 'ai'
import dotenv from 'dotenv';
dotenv.config();

export async function POST(request: Request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const req = await request.json();
  
  const prompt = (() => {
    switch (req.action) {
      case "eli5":
        return "You are an English Teacher . Explain this to me like I'm five :";
      case "summary":
        return "First tell me the number of questions that could be asked from this passage , then Generate Questions from the passage and provide anwsers for them as many possible from the section of text , the anwsers should be descriptive and atleast 6 lines long :";
      case "poem":
        // return "Make a short poem with proper formatting summarizing the following text:";
        return `
        You will generate reference to context like shown below , its just an example of what you will generate .

        <---- Example --- >
        "" I could never send my children away from home so confidently and fearlessly in such circumstances. ""
        a. Who does the narrator have in mind when she says, 'so confidently and fearlessly'?
        b. Which event in her life is she referring to here?
        c. What does she mean by 'such circumstances'?
        "" The thing to remember,' she said, 'is to look helpless but be efficient.' ""
        a. Who says this to whom?
        b. What did she mean by this advice?
        c. At what point does the speaker give this advice?
        "" But I was delighted at even this small glimpse of land. ""
        a. Who says this and at what point in their journey?
        b. What can be inferred by 'but' and 'even'?
        c. What land did she have a glimpse of?

        <---- Example --- >  

        You will give a refernce passage first like shown in example with proper spacing , and below it you will address the 
        questions and anwser them descriptively based on the qouted reference to context , you must anwser the questions as well .

        You are an expert at generating refernce to context sections for school students:
        `
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
    model: "gpt-3.5-turbo",
    stream: true,
  });

  const stream = OpenAIStream(chatCompletion);

  return new StreamingTextResponse(stream);
}
