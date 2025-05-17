const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const companyRouter = require('./routes/companies');
const app = express();

const corsOptions = {
    origin: 'https://competitor-avocarbon.azurewebsites.net',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight

app.use(bodyParser.json());
app.use('/companies', companyRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

