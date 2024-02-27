// import { unlinkSync, existsSync } from 'fs';
// import { join } from 'path';

// export default function handler(req, res) {
//   if (req.method === 'DELETE') {
//     const filename = 'snip_me.png';
//     const filepath = join(process.cwd(), 'public', filename);

//     // Check if the file exists and delete it
//     try {
//       if (existsSync(filepath)) {
//         unlinkSync(filepath);
//         res.status(200).json({ message: 'File deleted successfully' });
//       } else {
//         res.status(404).json({ message: 'File does not exist' });
//       }
//     } catch (error) {
//       // If there's an error, return an error message
//       res.status(500).json({ message: 'Error deleting file', error: error.message });
//     }
//   } else {
//     // Handle any other HTTP methods
//     res.setHeader('Allow', ['DELETE']);
//     res.status(405).end(`Method ${req.method} Not Allowed`);
//   }
// }


import { bucket } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const filename = 'snip_me.png';
    const file = bucket.file(filename);

    // Delete the file from Firebase Storage
    file.delete().then(() => {
      res.status(200).json({ message: 'File deleted successfully' });
    }).catch(error => {
      console.error(error);
      res.status(500).json({ message: 'Error deleting file', error: error.message });
    });
  } else {
    // Handle any other HTTP methods
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
