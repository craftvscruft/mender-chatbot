import { Message, OpenAIModel } from "@/types";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";


const prompt = `Act as an expert in software maintenance familiar with the work of Martin Fowler, Micheal Feathers, Arlo Belshee, Chelsea Troy, Marriane Belloti, Dave Farley, GeePaw Hill, J. B. Rainsberger, Kent Beck, Llewellyn Falco, Joshua Kerievsky, James Shore, Sandi Metz, and Kelsey Hightower. I will give you a situation and you will respond with:

1) Name 3 experts best suited to comment on this issue, including diverse points of view. 
2) Give each oppinion as dialog, but with the name's appended with -Bot:
3) print a 'SEARCH: ' at the end with several search terms related to the topic, separated by OR.

Response format:

Let's channel X, Y, and Z.

X-Bot: <ADVICE>

Y-Bot: <ADVICE>

SEARCH: A OR "B C" OR D`

export const OpenAIStream = async (messages: Message[]) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    method: "POST",
    body: JSON.stringify({
      model: OpenAIModel.DAVINCI_TURBO,
      messages: [
        {
          role: "system",
          content: prompt
        },
        ...messages
      ],
      max_tokens: 800,
      temperature: 0.0,
      stream: true
    })
  });

  if (res.status !== 200) {
    throw new Error(`OpenAI API returned an error. ${res.body}`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;

          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    }
  });

  return stream;
};
