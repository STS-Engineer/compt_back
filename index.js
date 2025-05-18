const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const companyRouter = require('./routes/companies');

const app = express();

// Configure CORS for production (replace * with your frontend URL later)
const corsOptions = {
  origin: '*', // Allows all origins (temporary for testing)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use('/companies', companyRouter);

// Azure requires process.env.PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
