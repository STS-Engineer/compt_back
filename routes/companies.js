const express = require('express');
const router = express.Router();
const pool = require('../db');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');


    const transporter = nodemailer.createTransport({
     host: "avocarbon-com.mail.protection.outlook.com",
     port: 25,
     secure: false,
     auth: {
     user: "administration.STS@avocarbon.com",
     pass: "shnlgdyfbcztbhxn",
     },
    });
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

async function sendApprovalEmail(requesterEmail, approvalLink) {
  const mailOptions = {
    from: 'administration.STS@avocarbon.com',
    to: 'mootaz.farwa@avocarbon.com', // admin/approver email
    subject: 'Company Submission Approval Required',
    html: `
      <p><strong>Requester Email:</strong> ${requesterEmail}</p>
      <p>A new company submission has been made and requires your approval.</p>
      <p>Please click the button below to approve this changes:</p>
      <a href="${approvalLink}" 
         style="
           display: inline-block;
           padding: 10px 20px;
           font-size: 16px;
           color: white;
           background-color: #007bff;
           text-decoration: none;
           border-radius: 5px;
           font-family: Arial, sans-serif;
         "
      >
        Approve the request for changes
      </a>
    `
  };

  await transporter.sendMail(mailOptions);
}


//Add neew pending companies
router.post('/', async (req, res) => {
  const token = uuidv4();
  const formData = req.body;
  const email = formData.email;


  try {
    await pool.query(
      `INSERT INTO pending_companies (form_data, email, token, status) VALUES ($1, $2, $3, $4)`,
      [formData, email, token, 'pending']
    );

    const approvalLink = `https://compt-back.azurewebsites.net/companies/approvee/${token}`;
    await sendApprovalEmail(email, approvalLink);

    res.status(200).json({ message: 'Submission received. Awaiting admin approval.' });
  } catch (err) {
    console.error('❌ Error storing pending company:', err);
    res.status(500).json({ message: 'Error submitting company' });
  }
});

router.put('/:id', async (req, res) => {
  const token = uuidv4();

  // ✅ Add this line to include the ID in the form data
  const formData = { ...req.body, id: req.params.id };

  const email = formData.email;

  try {
    // Save to pending_companies with 'pending' status
    await pool.query(
      `INSERT INTO pending_companies (form_data, email, token, status) VALUES ($1, $2, $3, $4)`,
      [formData, email, token, 'pending']
    );

    // Send approval email
    const approvalLink = `https://compt-back.azurewebsites.net/companies/approvee/${token}`;
    await sendApprovalEmail(email, approvalLink);

    res.status(200).json({ message: 'Submission received. Awaiting admin approval.' });
  } catch (err) {
    console.error('❌ Error storing pending company:', err);
    res.status(500).json({ message: 'Error submitting company' });
  }
});

//handle Approve 
router.get('/approvee/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Get pending company
    const result = await pool.query(
      'SELECT * FROM pending_companies WHERE token = $1 AND status = $2',
      [token, 'pending']
    );

     if (result.rows.length === 0) {
      return res.status(404).send('Invalid or already approved.');
    }
    const companyData = result.rows[0].form_data;
    console.log('responsedata',companyData);
  
    if (Array.isArray(companyData.productionlocation)) {
    companyData.productionlocation = companyData.productionlocation.join('; ');
   }

    // Check if update or insert
    if (companyData.id) {
      // UPDATE
   await pool.query(
   `UPDATE companies SET 
    name = $1, email = $2, headquarters_location = $3, r_and_d_location = $4,
    country = $5, product = $6, employeestrength = $7, revenues = $8, 
    telephone = $9, website = $10, productionvolumes = $11, keycustomers = $12,
    region = $13, foundingyear = $14, keymanagement = $15, rate = $16,
    offeringproducts = $17, customerneeds = $18, technologyuse = $19,
    competitiveadvantage = $20, challenges = $21, recentnews = $22,
    strategicpartenrship = $23, comments = $24, businessstrategies = $25,
    revenue = $26, ebit = $27, operatingcashflow = $28, investingcashflow = $29,
    freecashflow = $30, roce = $31, equityratio = $32, employeesperregion = $33,
    pricingstrategy = $34, productlaunch = $35, ceo = $36, cfo = $37,
    cto = $38, rdhead = $39, saleshead = $40, productionhead = $41,
    keydecisionmarker = $42, financialyear = $43, productionlocation = $44
  WHERE id = $45`,
  [
    companyData.name, companyData.email, companyData.headquarters_location,
    companyData.r_and_d_location, companyData.country, companyData.product,
    companyData.employeestrength, companyData.revenues, companyData.telephone,
    companyData.website, companyData.productionvolumes, companyData.keycustomers,
    companyData.region, companyData.foundingyear, companyData.keymanagement,
    companyData.rate, companyData.offeringproducts, companyData.customerneeds,
    companyData.technologyuse, companyData.competitiveadvantage,
    companyData.challenges, companyData.recentnews, companyData.strategicpartenrship,
    companyData.comments, companyData.businessstrategies, companyData.revenue,
    companyData.ebit, companyData.operatingcashflow, companyData.investingcashflow,
    companyData.freecashflow, companyData.roce, companyData.equityratio,
    companyData.employeesperregion, companyData.pricingstrategy,
    companyData.productlaunch, companyData.ceo, companyData.cfo, companyData.cto,
    companyData.rdhead, companyData.saleshead, companyData.productionhead,
    companyData.keydecisionmarker, companyData.financialyear, companyData.productionlocation,
    companyData.id
  ]
 );

    } else {
      // INSERT
await pool.query(
  `INSERT INTO companies (
    name, email, headquarters_location, r_and_d_location, country, product,
    employeestrength, revenues, telephone, website, productionvolumes, keycustomers,
    region, foundingyear, keymanagement, rate, offeringproducts, customerneeds,
    technologyuse, competitiveadvantage, challenges, recentnews,
    strategicpartenrship, comments, businessstrategies, revenue, ebit,
    operatingcashflow, investingcashflow, freecashflow, roce, equityratio,
    employeesperregion, pricingstrategy, productlaunch, ceo, cfo, cto,
    rdhead, saleshead, productionhead, keydecisionmarker, financialyear, productionlocation
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
    $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
    $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
    $41, $42, $43, $44
  )`,
  [
    companyData.name, companyData.email, companyData.headquarters_location,
    companyData.r_and_d_location, companyData.country, companyData.product,
    companyData.employeestrength, companyData.revenues, companyData.telephone,
    companyData.website, companyData.productionvolumes, companyData.keycustomers,
    companyData.region, companyData.foundingyear, companyData.keymanagement,
    companyData.rate, companyData.offeringproducts, companyData.customerneeds,
    companyData.technologyuse, companyData.competitiveadvantage,
    companyData.challenges, companyData.recentnews, companyData.strategicpartenrship,
    companyData.comments, companyData.businessstrategies, companyData.revenue,
    companyData.ebit, companyData.operatingcashflow, companyData.investingcashflow,
    companyData.freecashflow, companyData.roce, companyData.equityratio,
    companyData.employeesperregion, companyData.pricingstrategy,
    companyData.productlaunch, companyData.ceo, companyData.cfo, companyData.cto,
    companyData.rdhead, companyData.saleshead, companyData.productionhead,
    companyData.keydecisionmarker, companyData.financialyear, companyData.productionlocation
  ]
);



    }

    // Mark approved
    await pool.query(
      'UPDATE pending_companies SET status = $1 WHERE token = $2',
      ['approved', token]
    );

    res.send('✅ Competitor request approved by Parrimal PATKKI.');
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).send('Internal Server Error');
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


router.post('/request-approval', async (req, res) => {
  const { userEmail, type } = req.body;
  try {
    const token = uuidv4();

    await pool.query(
      'INSERT INTO approval_requests (email, type, token) VALUES ($1, $2, $3)',
      [userEmail, type, token]
    );

    const approvalLink = `https://compt-back.azurewebsites.net/companies/approve/${token}`;



await transporter.sendMail({
  from: 'administration.STS@avocarbon.com',
  to: 'mootaz.farwa@avocarbon.com',
  subject: `Approval Request for Competitor ${type.toUpperCase()}`,
  html: `
  <div style="font-family: Arial, sans-serif; background-color: #f5f6fa; padding: 20px; color: #2f3640;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      <h2 style="color: #333;">Approval Request</h2>
      <p>User <strong>${userEmail}</strong> has requested to <strong>${type}</strong> a competitor.</p>
      <p>Please review and approve the request using the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://compt-back.azurewebsites.net/companies/approve/${token}" 
           style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
          Approve Request
        </a>
      </div>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 0.8em; color: #aaa;">Sent by AVOCarbon Competitor Portal</p>
    </div>
  </div>
  `
});

    console.log(`📨 Email sent to Parimal for ${type} request by ${userEmail}`);
    console.log(`🔗 Approval link: ${approvalLink}`);

    res.status(200).json({ message: 'Approval email sent' });
  } catch (err) {
    console.error('Error requesting approval:', err);
    res.status(500).json({ message: 'Error requesting approval' });
  }
});

router.get('/approve/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query(
      'UPDATE approval_requests SET status = $1 WHERE token = $2 RETURNING *',
      ['approved', token]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Invalid or expired approval link');
    }

    res.send('✅ Approval successful. The user can now proceed.');
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/approval-status/:email/:type', async (req, res) => {
  const { email, type } = req.params;
  try {
    const result = await pool.query(
      `SELECT status FROM approval_requests
       WHERE email = $1 AND type = $2
       ORDER BY created_at DESC LIMIT 1`,
      [email, type]
    );

    if (result.rows.length === 0) {
      return res.json({ status: 'none' });
    }

    res.json({ status: result.rows[0].status });
  } catch (err) {
    console.error('Error checking status:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/approvals', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM approval_requests ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching approval requests:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/approvals/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE approval_requests SET status = $1 WHERE id = $2 RETURNING *',
      ['approved', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    console.log(`✅ Manually approved request ID ${id} (${result.rows[0].email}, ${result.rows[0].type})`);
    res.json({ message: 'Request approved', request: result.rows[0] });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
