import express from 'express';
import cors from 'cors'

const app = express();

app.use(express.json());
app.use(cors())

app.get('/', async (req, res) => {
  return res.status(200).json({ message: 'OK A' })
})

app.listen(3333, () => console.log('Server is Running...'))