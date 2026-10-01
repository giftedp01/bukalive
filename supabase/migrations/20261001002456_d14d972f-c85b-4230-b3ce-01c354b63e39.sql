-- Phase 0: table permissions
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Experiences: extend events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS country_id text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS business_id uuid,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS viewer_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replay_url text,
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

-- Chat Q&A
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_question boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answered_at timestamptz;
CREATE POLICY "Hosts mark questions answered" ON public.chat_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = chat_messages.event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = chat_messages.event_id AND e.host_id = auth.uid()));

-- Destinations
CREATE TABLE public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  country_id text NOT NULL,
  region text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  best_time text,
  category_id text,
  image_key text,
  cover_image_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.destinations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destinations TO authenticated;
GRANT ALL ON public.destinations TO service_role;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Destinations are public" ON public.destinations FOR SELECT USING (true);
CREATE POLICY "Admins manage destinations" ON public.destinations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER destinations_touch BEFORE UPDATE ON public.destinations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Tourism businesses
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  owner_id uuid,
  name text NOT NULL,
  business_type text NOT NULL DEFAULT 'tour_operator',
  country_id text NOT NULL,
  city text NOT NULL DEFAULT '',
  destination_slug text,
  category_id text,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  website text,
  logo_url text,
  verification_status text NOT NULL DEFAULT 'none'
    CHECK (verification_status IN ('none','pending','verified_business','verified_guide','verified_attraction','tourism_organisation')),
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses are public" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Owners create business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update business" ON public.businesses FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admins manage businesses" ON public.businesses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER businesses_touch BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.protect_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status NOT IN ('none','pending') THEN NEW.verification_status := 'pending'; END IF;
  ELSIF NEW.verification_status IS DISTINCT FROM OLD.verification_status AND NEW.verification_status <> 'pending' THEN
    NEW.verification_status := OLD.verification_status;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.protect_verification() FROM anon, authenticated;
CREATE TRIGGER businesses_protect_verification BEFORE INSERT OR UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.protect_verification();

-- Nearby listings (stay, food, attractions, activities, transport)
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_slug text NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('stay','food','attraction','activity','transport')),
  name text NOT NULL,
  summary text NOT NULL DEFAULT '',
  url text,
  price_from text,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings are public" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Admins manage listings" ON public.listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Business owners manage listings" ON public.listings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = listings.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = listings.business_id AND b.owner_id = auth.uid()));

-- Saves
CREATE TABLE public.saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('experience','destination','business')),
  item_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.saves TO authenticated;
GRANT ALL ON public.saves TO service_role;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saves" ON public.saves FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== Sample data (clearly flagged is_sample) =====
INSERT INTO public.destinations (slug,name,country_id,region,city,latitude,longitude,summary,description,best_time,category_id,image_key,is_featured,is_sample) VALUES
('kruger-national-park','Kruger National Park','ZA','Mpumalanga & Limpopo','Skukuza',-24.0,31.5,'Big Five country across two million hectares of bush.','One of Africa''s largest game reserves, home to lion, leopard, elephant, buffalo and rhino, with rest camps, private lodges and guided drives.','May – September (dry season)','wildlife-safari','kruger',true,true),
('hermanus','Hermanus','ZA','Western Cape','Hermanus',-34.42,19.24,'Land-based whale watching on the Cape Whale Coast.','Southern right whales calve in Walker Bay each winter, often visible from the cliff path. Wine estates and fynbos reserves sit just inland.','June – November','coastal-marine','hermanus',true,true),
('maasai-mara','Maasai Mara','KE','Narok County','Talek',-1.5,35.15,'The Great Migration and classic open savanna.','Kenya''s most famous reserve, known for big cats, balloon safaris and the wildebeest river crossings.','July – October','wildlife-safari','mara',true,true),
('kilimanjaro','Mount Kilimanjaro','TZ','Kilimanjaro Region','Moshi',-3.07,37.35,'Africa''s highest peak and its surrounding foothills.','Trekking routes to Uhuru Peak, coffee farms around Moshi and nearby Amboseli views.','January – March, June – October','nature-adventure','kilimanjaro',false,true),
('cape-coast','Cape Coast','GH','Central Region','Cape Coast',5.10,-1.25,'Historic castles, fishing towns and rainforest canopy walks.','A UNESCO-listed coastline with deep history, lively fishing beaches and Kakum National Park nearby.','November – March','culture-heritage','capecoast',false,true),
('marrakech','Marrakech','MA','Marrakech-Safi','Marrakech',31.63,-8.0,'Souks, riads and the gateway to the Atlas Mountains.','The red city''s medina, gardens and food stalls, with day trips to the High Atlas and the desert.','March – May, September – November','culture-heritage','marrakech',true,true),
('kyoto','Kyoto','JP','Kansai','Kyoto',35.01,135.77,'Temples, shrines, tea houses and seasonal festivals.','Japan''s former capital with over a thousand temples, geisha districts and some of the country''s best food.','March – May, October – November','culture-heritage','kyoto',true,true),
('amalfi-coast','Amalfi Coast','IT','Campania','Positano',40.63,14.48,'Cliffside villages, lemon groves and Mediterranean food.','A dramatic coastline of colourful towns linked by boat and winding road, famous for seafood and limoncello.','May – June, September','food-wine','amalfi',true,true),
('south-iceland','South Iceland','IS','Southern Region','Vík',63.42,-19.0,'Black-sand beaches, glaciers and northern lights.','Waterfalls, glacier lagoons and ice caves along the Ring Road, with aurora season in winter.','September – March (aurora), June – August','nature-adventure','iceland',true,true),
('rio-de-janeiro','Rio de Janeiro','BR','Rio de Janeiro State','Rio de Janeiro',-22.91,-43.17,'Beaches, mountains, samba and Carnival.','Sugarloaf, Christ the Redeemer, Copacabana and Ipanema, plus one of the world''s biggest festivals.','December – March','events-festivals','rio',true,true),
('great-barrier-reef','Great Barrier Reef','AU','Queensland','Cairns',-16.92,145.77,'The world''s largest coral reef system.','Snorkelling, diving, scenic flights and island stays along 2,300 km of reef.','June – October','coastal-marine','reef',false,true);

INSERT INTO public.businesses (slug,name,business_type,country_id,city,destination_slug,category_id,summary,description,website,is_sample) VALUES
('bushveld-trails','Bushveld Trails Safaris','safari_operator','ZA','Skukuza','kruger-national-park','wildlife-safari','Open-vehicle game drives and walking safaris.','Sample operator used to demonstrate how a safari business appears on BukaLive.',NULL,true),
('walker-bay-whales','Walker Bay Whale Co.','tour_operator','ZA','Hermanus','hermanus','coastal-marine','Boat-based whale watching from Hermanus harbour.','Sample operator for demonstration purposes.',NULL,true),
('mara-skies','Mara Skies Balloons','tour_operator','KE','Talek','maasai-mara','wildlife-safari','Dawn balloon flights over the Mara.','Sample operator for demonstration purposes.',NULL,true),
('summit-path','Summit Path Treks','guide','TZ','Moshi','kilimanjaro','nature-adventure','Guided Kilimanjaro climbs and foothill walks.','Sample operator for demonstration purposes.',NULL,true),
('coastline-heritage','Coastline Heritage Tours','tour_operator','GH','Cape Coast','cape-coast','culture-heritage','Castle tours and fishing-village walks.','Sample operator for demonstration purposes.',NULL,true),
('medina-tables','Medina Tables','local_experience','MA','Marrakech','marrakech','food-wine','Evening food walks through the medina.','Sample operator for demonstration purposes.',NULL,true),
('higashiyama-arts','Higashiyama Arts Collective','cultural_organisation','JP','Kyoto','kyoto','culture-heritage','Tea ceremony and craft workshops.','Sample operator for demonstration purposes.',NULL,true),
('limone-kitchen','Limone Kitchen','restaurant','IT','Positano','amalfi-coast','food-wine','Cooking classes in a lemon grove.','Sample operator for demonstration purposes.',NULL,true),
('aurora-hunters','Aurora Hunters Iceland','tour_operator','IS','Vík','south-iceland','nature-adventure','Northern lights and glacier tours.','Sample operator for demonstration purposes.',NULL,true),
('samba-nights','Samba Nights Rio','event_organiser','BR','Rio de Janeiro','rio-de-janeiro','events-festivals','Samba school rehearsals and street parties.','Sample operator for demonstration purposes.',NULL,true),
('reef-dreaming','Reef Dreaming Cruises','tour_operator','AU','Cairns','great-barrier-reef','coastal-marine','Day trips to the outer reef.','Sample operator for demonstration purposes.',NULL,true);

INSERT INTO public.listings (destination_slug,kind,name,summary,price_from,is_sample) VALUES
('kruger-national-park','stay','Riverside Bush Lodge','Thatched chalets overlooking the Sabie River.','from R2,400/night',true),
('kruger-national-park','food','Boma Dinner Under the Stars','Traditional braai in an open-air boma.',NULL,true),
('kruger-national-park','activity','Sunrise Walking Safari','Track wildlife on foot with an armed ranger.',NULL,true),
('kruger-national-park','attraction','Blyde River Canyon','One of the largest canyons on Earth, 2 hours away.',NULL,true),
('kruger-national-park','transport','Kruger Mpumalanga Airport','Daily flights from Johannesburg and Cape Town.',NULL,true),
('hermanus','stay','Cliff Path Guesthouse','Sea-view rooms a short walk from the whale path.',NULL,true),
('hermanus','food','Harbour Seafood Kitchen','Fresh line fish and oysters.',NULL,true),
('hermanus','attraction','Hemel-en-Aarde Wine Valley','Cool-climate wine estates 10 minutes inland.',NULL,true),
('maasai-mara','stay','Mara Tented Camp','Canvas tents on the Talek river.',NULL,true),
('maasai-mara','activity','Maasai Village Visit','Meet a local community with a guide.',NULL,true),
('maasai-mara','transport','Keekorok Airstrip','Light-aircraft flights from Nairobi.',NULL,true),
('kilimanjaro','stay','Moshi Coffee Farm Lodge','Stay on a working coffee estate.',NULL,true),
('kilimanjaro','activity','Materuni Waterfalls Hike','Half-day hike near Moshi.',NULL,true),
('cape-coast','attraction','Kakum Canopy Walkway','Rope bridges above the rainforest.',NULL,true),
('cape-coast','food','Coastal Fish Market','Grilled tilapia and kenkey.',NULL,true),
('marrakech','stay','Riad Dar Zellij','Courtyard riad in the old medina.',NULL,true),
('marrakech','activity','Atlas Mountains Day Trip','Berber villages and valley walks.',NULL,true),
('kyoto','stay','Gion Machiya House','Restored wooden townhouse.',NULL,true),
('kyoto','food','Nishiki Market','Kyoto''s kitchen — street snacks and pickles.',NULL,true),
('kyoto','attraction','Arashiyama Bamboo Grove','Early-morning bamboo forest walk.',NULL,true),
('amalfi-coast','stay','Positano Cliff Suites','Terraces over the sea.',NULL,true),
('amalfi-coast','transport','Amalfi Coast Ferries','Boats linking Positano, Amalfi and Capri.',NULL,true),
('south-iceland','activity','Glacier Ice Cave Tour','Seasonal ice caves under Vatnajökull.',NULL,true),
('south-iceland','stay','Vík Aurora Cabins','Glass-roof cabins for watching the sky.',NULL,true),
('rio-de-janeiro','attraction','Sugarloaf Cable Car','Two-stage cable car with bay views.',NULL,true),
('rio-de-janeiro','food','Ipanema Churrascaria','Brazilian barbecue near the beach.',NULL,true),
('great-barrier-reef','stay','Cairns Esplanade Hotel','Gateway to the reef.',NULL,true),
('great-barrier-reef','activity','Outer Reef Snorkel Trip','Full-day boat to the outer reef.',NULL,true);

-- Sample experiences (hosted by the existing approved host account)
INSERT INTO public.events (host_id,business_id,title,description,category,category_id,subcategory,location,country_id,destination_id,latitude,longitude,scheduled_at,duration_minutes,price_cents,currency,status,is_published,viewer_count,event_type,is_sample,book_url)
SELECT '78cda47a-009d-478d-9b4c-2956e01e69dd', b.id, v.title, v.descr, v.cat::public.event_category, v.cat_id, v.sub, v.loc, v.country, v.dest, v.lat, v.lng,
  now() + (v.offset_min || ' minutes')::interval, v.dur, v.price, v.cur, v.status::public.event_status, true, v.viewers, v.etype, true, NULL
FROM (VALUES
 ('bushveld-trails','Live Safari: Sunrise Game Drive','Ride along on an open-vehicle drive as rangers track lions and elephants at first light.','safari','wildlife-safari','Game drive','Kruger National Park','ZA','kruger-national-park',-24.99,31.59,-40,180,0,'ZAR','live',184,'free_ad_slot'),
 ('walker-bay-whales','Live Whale Watching from Walker Bay','Southern right whales breaching just off the Hermanus coast.','other','coastal-marine','Whale watching','Hermanus','ZA','hermanus',-34.42,19.25,-20,120,0,'ZAR','live',96,'free_ad_slot'),
 ('mara-skies','Balloon Over the Mara at Dawn','Float over the plains as the migration herds move below.','safari','wildlife-safari','Balloon safari','Maasai Mara','KE','maasai-mara',-1.49,35.14,-10,90,9900,'USD','live',212,'ticketed'),
 ('medina-tables','Marrakech Night Food Walk','Join a host through Jemaa el-Fnaa''s food stalls at sunset.','other','food-wine','Food tour','Marrakech','MA','marrakech',31.62,-7.99,180,90,0,'USD','upcoming',0,'free_ad_slot'),
 ('higashiyama-arts','Kyoto Tea Ceremony, Live','A tea master explains each step of a traditional ceremony.','arts','culture-heritage','Tea ceremony','Kyoto','JP','kyoto',35.0,135.78,1440,60,1500,'USD','upcoming',0,'ticketed'),
 ('aurora-hunters','Northern Lights Hunt','Follow the aurora forecast with guides on the south coast.','other','nature-adventure','Aurora tour','Vík','IS','south-iceland',63.42,-19.01,2880,150,0,'USD','upcoming',0,'free_ad_slot'),
 ('samba-nights','Samba School Rehearsal Night','Inside a Rio samba school as it prepares for Carnival.','festival','events-festivals','Carnival','Rio de Janeiro','BR','rio-de-janeiro',-22.91,-43.2,4320,120,1000,'USD','upcoming',0,'ticketed'),
 ('summit-path','Kilimanjaro Summit Sunrise','The final push to Uhuru Peak, streamed from the crater rim.','extreme_sports','nature-adventure','Trekking','Mount Kilimanjaro','TZ','kilimanjaro',-3.07,37.35,-8640,180,0,'USD','ended',0,'free_ad_slot'),
 ('limone-kitchen','Amalfi Lemon Grove Cooking Class','Make fresh pasta and limoncello on a terrace above the sea.','other','food-wine','Cooking class','Positano','IT','amalfi-coast',40.63,14.49,-4320,90,0,'EUR','ended',0,'free_ad_slot'),
 ('coastline-heritage','Cape Coast Castle Heritage Walk','A guided walk through the castle''s history and the town around it.','other','culture-heritage','Heritage tour','Cape Coast','GH','cape-coast',5.1,-1.24,-2880,75,0,'USD','ended',0,'free_ad_slot'),
 ('reef-dreaming','Outer Reef Snorkel Live','Underwater cameras on the outer Great Barrier Reef.','other','coastal-marine','Snorkelling','Cairns','AU','great-barrier-reef',-16.5,146.0,300,120,0,'AUD','upcoming',0,'free_ad_slot')
) AS v(bslug,title,descr,cat,cat_id,sub,loc,country,dest,lat,lng,offset_min,dur,price,cur,status,viewers,etype)
JOIN public.businesses b ON b.slug = v.bslug;

NOTIFY pgrst, 'reload schema';