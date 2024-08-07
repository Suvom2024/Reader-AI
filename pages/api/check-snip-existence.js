// import { existsSync } from 'fs';
// import { join } from 'path';

// export default function handler(req, res) {
//   if (req.method === 'GET') {
//     const filename = 'snip_me.png';
//     const filepath = join(process.cwd(), 'public', filename);

//     // Check if the file exists
//     const fileExists = existsSync(filepath);

//     res.status(200).json({ exists: fileExists });
//   } else {
//     // Handle any other HTTP methods
//     res.setHeader('Allow', ['GET']);
//     res.status(405).end(`Method ${req.method} Not Allowed`);
//   }
// }
import { bucket } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const filename = 'snip_me.png';
    const file = bucket.file(filename);

    // Check if the file exists in Firebase Storage
    file.exists().then(data => {
      const exists = data[0];
      res.status(200).json({ exists });
    }).catch(error => {
      console.error(error);
      res.status(500).json({ error: error.message });
    });
  } else {
    // Handle any other HTTP methods
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
