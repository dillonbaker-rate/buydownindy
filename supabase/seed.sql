-- Optional demo data: the 12 sample listings from the design, labeled "Sample" in the UI.
-- Delete with: delete from public.listings where is_sample;

delete from public.listings where is_sample;

insert into public.listings
  (address, city, county, zip, lat, lng, price, beds, baths, sqft, concession, loan_types, default_down_pct,
   hoa_mo, built_year, external_url, status, expires_at, photo_rights_confirmed, is_sample, is_example,
   sample_agent_name, sample_brokerage)
values
  ('12135 Ashland Dr','Fishers','Hamilton','46037',39.9612,-85.9655,599900,4,3,4343,15000,'{Conventional,FHA,VA}',5,72,2006,
   'https://www.zillow.com/homedetails/12135-Ashland-Dr-Fishers-IN-46037/94403003_zpid/','live','2099-01-01',true,true,true,'Jordan Sample','Sample Realty'),
  ('4410 Sample Ave','Fishers','Hamilton',null,39.9050,-86.0550,299900,3,2.5,1720,15000,'{Conventional,FHA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('88 Sample Ct','Noblesville','Hamilton',null,40.0456,-86.0086,415000,4,3,2600,12000,'{Conventional,FHA,VA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('2150 Sample Dr','Westfield','Hamilton',null,40.0428,-86.1275,489000,4,3.5,3100,20000,'{Conventional}',10,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('710 Sample Ln','Indianapolis','Marion',null,39.7750,-86.0500,265000,3,1.5,1400,8000,'{Conventional,FHA,VA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('1932 Sample Pkwy','Indianapolis','Marion',null,39.8700,-86.1420,379000,3,2,1900,10000,'{Conventional,FHA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('505 Sample Way','Indianapolis','Marion',null,39.7220,-86.1500,315000,2,2,1300,6000,'{Conventional,FHA,VA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('64 Sample Rd','Avon','Hendricks',null,39.7628,-86.3997,329900,4,2.5,2300,10000,'{Conventional,FHA,VA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('3300 Sample Blvd','Plainfield','Hendricks',null,39.7042,-86.3994,285000,3,2,1650,7500,'{Conventional,FHA,VA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('17 Sample Cir','Greenwood','Johnson',null,39.6137,-86.1067,310000,3,2,1800,9000,'{Conventional,FHA,VA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('902 Sample Trl','Zionsville','Boone',null,39.9509,-86.2619,560000,4,3.5,3400,25000,'{Conventional}',20,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty'),
  ('41 Sample Pl','Greenfield','Hancock',null,39.7851,-85.7694,274500,3,2,1600,5000,'{Conventional,FHA,VA}',5,null,null,null,'live','2099-01-01',true,true,false,'Jordan Sample','Sample Realty');
