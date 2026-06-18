import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/extractSchedule", async (req, res) => {
  try {
    const { text, room } = req.body;

    const completion =
      await client.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `
You are a schedule extraction engine.

Extract ALL schedules.

Return ONLY JSON.

Format:

[
{
subject:"",
section:"",
faculty:"",
room:"",
day:"",
startTime:"",
endTime":""
}
]

Day must be:
MON
TUE
WED
THU
FRI
SAT
SUN

Use schedule column placement to determine day.
`
          },
          {
            role: "user",
            content: text
          }
        ]
      });

    const json =
      JSON.parse(
        completion.choices[0].message.content
      );

    res.json(json);
  }
  catch(err){
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(5000);