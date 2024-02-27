// import { parse } from 'url';
// import { writeFile, existsSync, mkdirSync } from 'fs';
// import { join } from 'path';
// import { bucket } from '../../lib/firebaseAdmin';

// export default function handler(req, res) {
//   if (req.method === 'POST') {
//     const { image } = req.body;
//     const imageBuffer = Buffer.from(image.split(';base64,').pop(), 'base64');

//     // Define the public directory and file path
//     const publicDir = join(process.cwd(), 'public');
//     const filename = 'snip_me.png';
//     const filepath = join(publicDir, filename);

//     // Create the public directory if it doesn't exist
//     if (!existsSync(publicDir)) {
//       mkdirSync(publicDir, { recursive: true });
//     }

//     // Save the image
//     writeFile(filepath, imageBuffer, error => {
//       if (error) {
//         res.status(500).json({ message: 'Error saving image', error: error.message });
//       } else {
//         res.status(200).json({ message: 'Image saved successfully', filename: filename });
//       }
//     });
//   } else {
//     // Handle any other HTTP methods
//     res.setHeader('Allow', ['POST']);
//     res.status(405).end(`Method ${req.method} Not Allowed`);
//   }
// }


// Your API handler file
import { bucket } from '../../lib/firebaseAdmin';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { image } = req.body;
    // Assuming image is a base64 encoded string
    const imageBuffer = Buffer.from(image.split(';base64,').pop(), 'base64');
    const filename = 'snip_me.png';
    const file = bucket.file(filename); // The file object for Firebase Storage

    const stream = file.createWriteStream({
      metadata: {
        contentType: 'image/png',
      },
    });

    stream.on('error', (error) => {
      console.error(error);
      res.status(500).json({ message: 'Error uploading to Firebase Storage', error: error.message });
    });

    stream.on('finish', () => {
      // Make the image publicly readable (if desired)
      file.makePublic()
        .then(() => {
          // Get the public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
          res.status(200).json({ message: 'Image saved successfully', url: publicUrl });
        })
        .catch(error => {
          console.error(error);
          res.status(500).json({ message: 'Error making the image public', error: error.message });
        });
    });

    stream.end(imageBuffer);
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}
