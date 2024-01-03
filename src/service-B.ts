import express from 'express';
import cors from 'cors';
import CircuitBreaker from './circuit-breaker-A';

const app = express();

app.use(express.json());
app.use(cors())

const circuitBreaker = new CircuitBreaker();

app.get('/', async (req, res) => {
  const url = 'http://localhost:3333/';

  const response = await circuitBreaker.callService({
    url,
    method: 'GET',
  });

  if (!response) {
    console.log('error')
  } else {
    console.log(response)
  }

  return res.send()
})

app.listen(3334, () => console.log('Server is Running...'))