-- Add QR code URL column to fundraising campaigns
alter table jeevarasi_fundraising
  add column if not exists qr_code_url text;
