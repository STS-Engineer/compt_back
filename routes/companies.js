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

async function sendApprovalEmail(emailrequester, approvalLink, action, newData, oldData = null) {
  const formatDataAsHtml = (data) => {
    return Object.entries(data).map(([key, value]) => {
      const prettyKey = key.replace(/_/g, ' ').toUpperCase();
      return `<p><strong>${prettyKey}:</strong> ${value ?? '—'}</p>`;
    }).join('');
  };

  const formatComparisonAsHtml = (newData, oldData) => {
    return Object.entries(newData).map(([key, newValue]) => {
      const oldValue = oldData[key];
      if (oldValue !== newValue) {
        const prettyKey = key.replace(/_/g, ' ').toUpperCase();
        return `
          <p><strong>${prettyKey}:</strong><br/>
          <span style="color: gray;">Old:</span> ${oldValue ?? '—'}<br/>
          <span style="color: green;">New:</span> ${newValue ?? '—'}</p>
        `;
      }
      return '';
    }).join('');
  };

  const content = action === 'update'
    ? formatComparisonAsHtml(newData, oldData)
    : formatDataAsHtml(newData);

  const mailOptions = {
    from: 'administration.STS@avocarbon.com',
    to: 'mootaz.farwa@avocarbon.com',
    subject: `Company Submission Approval - ${action.toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Company Submission Approval Required</h2>
        <p><strong>Requester Email:</strong> ${emailrequester}</p>
        <p><strong>Action:</strong> ${action.toUpperCase()}</p>
        <hr />
        ${content || '<p>No changes detected</p>'}
        <div style="margin-top: 30px;">
          <a href="${approvalLink}"
             style="
               display: inline-block;
               padding: 10px 20px;
               font-size: 16px;
               color: white;
               background-color: #007bff;
               text-decoration: none;
               border-radius: 5px;
             ">
            Approve the request
          </a>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}


//Add neew pending companies
router.post('/', async (req, res) => {
  const token = uuidv4();
  const formData = req.body;
  const email = formData.email;
  const emailrequester = formData.emailrequester; 

  try {
   await pool.query(
      `INSERT INTO pending_companies (form_data, email, token, status, emailrequester) VALUES ($1, $2, $3, $4, $5)`,
      [formData, email, token, 'pending', emailrequester]
    );



    const approvalLink = `https://compt-back.azurewebsites.net/companies/approvee/${token}`;
    await sendApprovalEmail(emailrequester, approvalLink, 'add', formData);


    res.status(200).json({ message: 'Submission received. Awaiting admin approval.' });
  } catch (err) {
    console.error('❌ Error storing pending company:', err);
    res.status(500).json({ message: 'Error submitting company' });
  }
});


// Updated PUT route with production location handling
router.put('/:id', async (req, res) => {
  const token = uuidv4();
  const formData = { ...req.body, id: req.params.id };
  const email = formData.email;
  const emailrequester = formData.emailrequester;   

  try {
    // Process production location - handle both array and string formats
    let processedProductionLocation = formData.productionlocation;
    
    if (Array.isArray(formData.productionlocation)) {
      // If it's an array, format it properly
      processedProductionLocation = formData.productionlocation
        .map(loc => `"${loc.trim()}"`)
        .join('; ');
    } else if (typeof formData.productionlocation === 'string') {
      // If it's already a string, ensure it's properly formatted
      // Split by semicolon, clean up, and rejoin
      const locations = formData.productionlocation
        .split(';')
        .map(loc => loc.trim().replace(/^"|"$/g, '')) // Remove existing quotes
        .filter(loc => loc.length > 0) // Remove empty strings
        .map(loc => `"${loc}"`) // Add quotes back
        .join('; ');
      processedProductionLocation = locations;
    }

    // Update the formData with processed production location
    formData.productionlocation = processedProductionLocation;

    // Store the EXACT production location received
    await pool.query(
      `INSERT INTO pending_companies (form_data, email, token, status, emailrequester) VALUES ($1, $2, $3, $4, $5)`,
      [formData, email, token, 'pending', emailrequester]
    );


    const approvalLink = `https://compt-back.azurewebsites.net/companies/approvee/${token}`;
    const existingCompany = await pool.query('SELECT * FROM companies WHERE id = $1', [formData.id]);

    if (existingCompany.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found for update' });
    }

    await sendApprovalEmail(emailrequester, approvalLink, 'update', formData, existingCompany.rows[0]);
    res.status(200).json({ 
      message: 'Submission received. Awaiting admin approval.',
      token: token
    });
  } catch (err) {
    console.error('Error storing pending company:', err);
    res.status(500).json({ message: 'Error submitting company' });
  }
});

// Updated approval route with better production location handling
router.get('/approvee/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM pending_companies WHERE token = $1 AND status = $2',
      [token, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Invalid or already approved.');
    }

    const companyData = result.rows[0].form_data;

    // Simple HTML page with company info and form to approve
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Approve Company Submission</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 600px; margin: auto; }
          h1 { color: #007bff; }
          .info { margin-bottom: 20px; }
          button {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 12px 25px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
          }
          button:hover {
            background-color: #218838;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Approve Company Submission</h1>
          <div class="info">
            <p><strong>Name:</strong> ${companyData.name || '—'}</p>
            <p><strong>Email:</strong> ${companyData.email || '—'}</p>
            <p><strong>Product:</strong> ${companyData.product || '—'}</p>
            <!-- Add other fields as needed -->
          </div>
          <form method="POST" action="/companies/approvee/${token}">
            <button type="submit">Confirm Approval</button>
          </form>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Error loading approval page:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/approvee/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Get pending company info
    const pendingRes = await pool.query(
      'SELECT * FROM pending_companies WHERE token = $1 AND status = $2',
      [token, 'pending']
    );

    if (pendingRes.rows.length === 0) {
      return res.status(404).send('Invalid or already approved.');
    }

    const companyData = pendingRes.rows[0].form_data;

    // Prepare production location format (same logic as before)
    let finalProductionLocation = companyData.productionlocation;
    if (Array.isArray(companyData.productionlocation)) {
      finalProductionLocation = companyData.productionlocation
        .map(loc => `"${loc.trim()}"`)
        .join('; ');
    } else if (typeof companyData.productionlocation === 'string') {
      finalProductionLocation = companyData.productionlocation
        .split(';')
        .map(loc => loc.trim().replace(/^"|"$/g, ''))
        .filter(loc => loc.length > 0)
        .map(loc => `"${loc}"`)
        .join('; ');
    }

    // Insert or update company
    if (companyData.id) {
      // Update existing company
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
          companyData.keydecisionmarker, companyData.financialyear, finalProductionLocation,
          companyData.id
        ]
      );
    } else {
      // Insert new company
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
          companyData.keydecisionmarker, companyData.financialyear, finalProductionLocation
        ]
      );
    }

    // Update pending status to approved
    await pool.query(
      'UPDATE pending_companies SET status = $1 WHERE token = $2',
      ['approved', token]
    );

    res.send('<h2>✅ Company successfully approved.</h2><p>You may now close this window.</p>');
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).send('Internal Server Error');
  }
});


// Helper function to parse production locations from database
function parseProductionLocations(productionLocationString) {
  if (!productionLocationString) return [];
  
  return productionLocationString
    .split(';')
    .map(loc => loc.trim().replace(/^"|"$/g, ''))
    .filter(loc => loc.length > 0);
}

// Helper function to format production locations for database
function formatProductionLocations(locations) {
  if (!locations || locations.length === 0) return '';
  
  return locations
    .map(loc => `"${loc.trim()}"`)
    .join('; ');
}

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
