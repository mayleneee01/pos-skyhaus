import { NextRequest, NextResponse } from 'next/server';

// This is a mock sandbox endpoint simulating an EDC machine processing a payment.
// It will wait a few seconds and then call our own webhook callback endpoint.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transaction_id, edc_reference, amount, payment_type } = body;

    console.log(`[MOCK EDC] Received payment request for ${edc_reference} - Amount: ${amount}`);

    // Simulate user entering PIN and processing delay (5 seconds)
    setTimeout(async () => {
      console.log(`[MOCK EDC] Processing complete for ${edc_reference}. Sending SUCCESS to webhook...`);
      
      const baseUrl = req.headers.get('host') ? `http://${req.headers.get('host')}` : 'http://localhost:3000';
      
      try {
        await fetch(`${baseUrl}/api/edc/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_id: transaction_id,
            status: 'SUCCESS', // Simulate a successful payment
            edc_reference: edc_reference
          }),
        });
        console.log(`[MOCK EDC] Webhook delivered successfully.`);
      } catch (err) {
        console.error(`[MOCK EDC] Failed to deliver webhook:`, err);
      }
    }, 5000); // 5 seconds delay

    return NextResponse.json({ 
      success: true, 
      message: 'Processing started on Mock EDC',
      edc_reference
    });
  } catch (error) {
    console.error('Mock EDC Error:', error);
    return NextResponse.json({ error: 'Internal mock server error' }, { status: 500 });
  }
}
