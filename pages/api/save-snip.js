import { parse } from 'url';
import { writeFile, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { image } = req.body;
    const imageBuffer = Buffer.from(image.split(';base64,').pop(), 'base64');

    // Define the public directory and file path
    const publicDir = join(process.cwd(), 'public');
    const filename = 'snip_me.png';
    const filepath = join(publicDir, filename);

    // Create the public directory if it doesn't exist
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    // Save the image
    writeFile(filepath, imageBuffer, error => {
      if (error) {
        res.status(500).json({ message: 'Error saving image', error: error.message });
      } else {
        res.status(200).json({ message: 'Image saved successfully', filename: filename });
      }
    });
  } else {
    // Handle any other HTTP methods
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
