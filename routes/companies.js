const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all companies
router.get('/', async (req, res) => {       
  try {
    const result = await pool.query('SELECT * FROM companies');
    res.json(result.rows);           
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ message: 'Internal server error' });  
  }
});

// Add a new company
router.post('/', async (req, res) => {
  const { 
    name, email, headquarters_location, r_and_d_location, country, product, employeestrength, revenues, 
    telephone, website, productionvolumes, keycustomers, region, foundingyear, keymanagement, rate, 
    offeringproducts, customerneeds, technologyuse, competitiveadvantage, challenges, 
    recentnews, strategicpartenrship, comments, businessstrategies, revenue, ebit, operatingcashflow, investingcashflow, freecashflow, roce, equityratio, employeesperregion, pricingstrategy, productlaunch, ceo, cfo, cto, rdhead, saleshead, productionhead, keydecisionmarker, financialyear
  } = req.body;

  try {
    const productsJSON = Array.isArray(product) ? JSON.stringify(product) : product;
    console.log('📌 Incoming Request Body:', req.body);
    
    const result = await pool.query(
      `INSERT INTO companies (
        name, email, headquarters_location, r_and_d_location, country, product, employeestrength, revenues, 
        telephone, website, productionvolumes, keycustomers, region, foundingyear, keymanagement, rate, 
        offeringproducts, customerneeds, technologyuse, competitiveadvantage, challenges, 
        recentnews, strategicpartenrship, comments, businessstrategies, revenue, ebit, operatingcashflow, investingcashflow, freecashflow, roce, equityratio, employeesperregion, pricingstrategy, productlaunch, ceo, cfo, cto, rdhead, saleshead, productionhead, keydecisionmarker, financialyear
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
        $17, $18, $19, $20, $21, $22, $23,  $24,  $25, $26,  $27,  $28, $29,  $30,  $31,  $32, $33,  $34,  $35, $36,  $37,  $38,  $39, $40,  $41,  $42,  $43
      ) RETURNING *`,
      [
        name, email, headquarters_location, r_and_d_location, country, productsJSON, employeestrength, revenues, 
        telephone, website, productionvolumes, keycustomers, region, foundingyear, keymanagement, rate, 
        offeringproducts, customerneeds, technologyuse, competitiveadvantage, challenges, 
        recentnews, strategicpartenrship, comments, businessstrategies, revenue, ebit, operatingcashflow, investingcashflow, freecashflow, roce, equityratio, employeesperregion, pricingstrategy, productlaunch, ceo, cfo, cto, rdhead, saleshead, productionhead, keydecisionmarker, financialyear
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error adding company:', err);
    res.status(500).json({ message: 'Internal server error', error: err });
  }
});



// Update an existing company
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, email, headquarters_location, r_and_d_location, country, product,
    employeestrength, revenues, telephone, website, productionvolumes,
    keycustomers, region, foundingyear, keymanagement, rate, offeringproducts,
    pricingstrategy, customerneeds, technologyuse, competitiveadvantage,
    challenges, recentnews, productlaunch, strategicpartenrship, comments,
    employeesperregion, businessstrategies, revenue, ebit,
    operatingcashflow, investingcashflow, freecashflow, roce, equityratio,
    ceo, cfo, cto, rdhead, saleshead, productionhead, keydecisionmarker, financialyear
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE companies SET
        name = $1,
        email = $2,
        headquarters_location = $3,
        r_and_d_location = $4,
        country = $5,
        product = $6,
        employeestrength = $7,
        revenues = $8,
        telephone = $9,
        website = $10,
        productionvolumes = $11,
        keycustomers = $12,
        region = $13,
        foundingyear = $14,
        keymanagement = $15,
        rate = $16,
        offeringproducts = $17,
        pricingstrategy = $18,
        customerneeds = $19,
        technologyuse = $20,
        competitiveadvantage = $21,
        challenges = $22,
        recentnews = $23,
        productlaunch = $24,
        strategicpartenrship = $25,
        comments = $26,
        employeesperregion = $27,
        businessstrategies = $28,
        revenue = $29,
        ebit = $30,
        operatingcashflow = $31,
        investingcashflow = $32,
        freecashflow = $33,
        roce = $34,
        equityratio = $35,
        ceo = $36,
        cfo = $37,
        cto = $38,
        rdhead = $39,
        saleshead = $40,
        productionhead = $41,
        keydecisionmarker = $42,
        financialyear = $43
      WHERE id = $44
      RETURNING *`,
      [
        name, email, headquarters_location, r_and_d_location, country, product,
        employeestrength, revenues, telephone, website, productionvolumes,
        keycustomers, region, foundingyear, keymanagement, rate, offeringproducts,
        pricingstrategy, customerneeds, technologyuse, competitiveadvantage,
        challenges, recentnews, productlaunch, strategicpartenrship, comments,
        employeesperregion, businessstrategies, revenue, ebit,
        operatingcashflow, investingcashflow, freecashflow, roce, equityratio,
        ceo, cfo, cto, rdhead, saleshead, productionhead, keydecisionmarker, financialyear, id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Get a single company by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching company by ID:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
