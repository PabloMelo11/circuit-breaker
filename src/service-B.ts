import express from 'express';
import cors from 'cors';
import CircuitBreaker from './circuit-breaker';
import AxiosAdapter from './axios-adapter';

const app = express();

app.use(express.json());
app.use(cors())

const axiosAdapter = new AxiosAdapter();
const circuitBreaker = new CircuitBreaker(axiosAdapter);

app.get('/', async (req, res) => {
  const url = 'http://localhost:3333/';

  const response = await circuitBreaker.callService(url);

  if (!response) {
    console.log('error')
  } else {
    console.log(response)
  }

  return res.send()
})

app.listen(3334, () => console.log('Server is Running...'))