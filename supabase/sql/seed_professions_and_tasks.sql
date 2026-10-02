-- Starter catalog of professions and tasks (English + Arabic).
-- Safe to run more than once: every row is skipped if one with the same English
-- name already exists (tasks are matched within their profession), so it never
-- creates duplicates and never touches anything an admin has edited.
-- Run in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
-- After running, an admin can rename, deactivate, or add to any of it from
-- /admin/professions - this is only a starting point.

insert into public.professions (name_en, name_ar)
select v.name_en, v.name_ar
from (values
  ('Cleaner', 'عامل نظافة'),
  ('Housekeeper', 'عاملة منزل'),
  ('Plumber', 'سباك'),
  ('Electrician', 'كهربائي'),
  ('Carpenter', 'نجار'),
  ('Painter', 'نقاش'),
  ('Tiler and Flooring', 'مبلّط (سيراميك ورخام)'),
  ('Mason and Plasterer', 'بنّاء ومحّارة'),
  ('Gypsum and False Ceiling', 'فني جيبس بورد وأسقف معلقة'),
  ('Aluminum and Glass', 'فني ألوميتال وزجاج'),
  ('Blacksmith and Welder', 'حدّاد ولحام'),
  ('Locksmith', 'فني أقفال'),
  ('Waterproofing and Insulation', 'فني عزل مائي وحراري'),
  ('Appliance Repair', 'فني صيانة أجهزة منزلية'),
  ('Air Conditioning', 'فني تكييف وتبريد'),
  ('Gas Technician', 'فني غاز'),
  ('Water Filter and Tank', 'فني فلاتر وخزانات مياه'),
  ('TV and Electronics', 'فني تلفزيون وإلكترونيات'),
  ('Computer and Network', 'فني كمبيوتر وشبكات'),
  ('Solar Panels', 'فني طاقة شمسية'),
  ('Handyman', 'فني صيانة عامة'),
  ('Pest Control', 'مكافحة حشرات'),
  ('Gardener', 'جنايني (بستاني)'),
  ('Pool Maintenance', 'فني حمامات سباحة'),
  ('Upholsterer', 'منجّد'),
  ('Tailor', 'خيّاط'),
  ('Hairdresser', 'كوافير'),
  ('Barber', 'حلّاق'),
  ('Beautician', 'خبيرة تجميل'),
  ('Makeup Artist', 'خبير مكياج'),
  ('Cook', 'طباخ'),
  ('Caterer', 'متعهد حفلات'),
  ('Nanny', 'مربية أطفال'),
  ('Caregiver', 'مرافق رعاية'),
  ('Home Nurse', 'ممرض منزلي'),
  ('Driver', 'سائق'),
  ('Mover', 'عامل نقل أثاث'),
  ('Car Mechanic', 'ميكانيكي سيارات'),
  ('Car Washer', 'غسيل سيارات'),
  ('Security Guard', 'حارس أمن'),
  ('Private Tutor', 'مدرس خصوصي')
) as v(name_en, name_ar)
where not exists (select 1 from public.professions p where p.name_en = v.name_en);

insert into public.task_types (profession_id, name_en, name_ar)
select p.id, v.name_en, v.name_ar
from (values
  ('Cleaner', 'Home deep cleaning', 'تنظيف منزلي شامل'),
  ('Cleaner', 'Regular home cleaning', 'تنظيف منزلي دوري'),
  ('Cleaner', 'Office cleaning', 'تنظيف مكاتب'),
  ('Cleaner', 'Kitchen and bathroom cleaning', 'تنظيف مطابخ وحمامات'),
  ('Cleaner', 'Window and glass cleaning', 'تنظيف زجاج ونوافذ'),
  ('Cleaner', 'Carpet and upholstery cleaning', 'تنظيف سجاد ومفروشات'),
  ('Cleaner', 'Post-construction cleaning', 'تنظيف بعد التشطيب'),
  ('Cleaner', 'Move-in or move-out cleaning', 'تنظيف عند الانتقال'),

  ('Housekeeper', 'Daily part-time housekeeping', 'عمل منزلي يومي'),
  ('Housekeeper', 'Live-in housekeeping', 'عمل منزلي بإقامة كاملة'),
  ('Housekeeper', 'Laundry and ironing', 'غسيل وكي ملابس'),
  ('Housekeeper', 'Home organizing', 'ترتيب وتنظيم المنزل'),

  ('Plumber', 'Fix leaks', 'إصلاح تسريبات المياه'),
  ('Plumber', 'Unclog drains and sewers', 'تسليك مجاري وبلاعات'),
  ('Plumber', 'Install or repair taps and sinks', 'تركيب وإصلاح صنابير وأحواض'),
  ('Plumber', 'Install or repair toilets and bathroom fixtures', 'تركيب وإصلاح أدوات صحية'),
  ('Plumber', 'Water heater installation and repair', 'تركيب وإصلاح سخانات المياه'),
  ('Plumber', 'Pipes and water pump installation', 'تركيب مواسير ومضخات مياه'),

  ('Electrician', 'Wiring and rewiring', 'تمديد وتغيير الأسلاك'),
  ('Electrician', 'Install lights and chandeliers', 'تركيب إضاءة وثريات'),
  ('Electrician', 'Install or repair sockets and switches', 'تركيب وإصلاح مفاتيح وبرايز'),
  ('Electrician', 'Fix power outages and short circuits', 'إصلاح انقطاع الكهرباء وقصر الدائرة'),
  ('Electrician', 'Electrical panel and breakers', 'تركيب وصيانة لوحات الكهرباء'),
  ('Electrician', 'Intercom and doorbell', 'تركيب وإصلاح إنتركوم وجرس'),
  ('Electrician', 'Ceiling fan installation', 'تركيب مراوح سقف'),

  ('Carpenter', 'Furniture repair', 'إصلاح الأثاث'),
  ('Carpenter', 'Custom furniture making', 'تصنيع أثاث حسب الطلب'),
  ('Carpenter', 'Wooden doors and windows', 'تركيب وإصلاح أبواب وشبابيك خشب'),
  ('Carpenter', 'Kitchen cabinets', 'تصنيع وتركيب مطابخ'),
  ('Carpenter', 'Wardrobes and closets', 'تفصيل وتركيب دواليب'),
  ('Carpenter', 'Furniture assembly and disassembly', 'تجميع وفك وتركيب الأثاث'),

  ('Painter', 'Interior painting', 'دهان داخلي'),
  ('Painter', 'Exterior painting', 'دهان خارجي'),
  ('Painter', 'Wallpaper installation', 'تركيب ورق حائط'),
  ('Painter', 'Decorative paint finishes', 'دهانات وديكورات زخرفية'),
  ('Painter', 'Wall repair and putty', 'ترميم وتجهيز الحوائط (معجون)'),

  ('Tiler and Flooring', 'Floor tiling', 'تبليط أرضيات'),
  ('Tiler and Flooring', 'Wall tiling', 'تركيب سيراميك حوائط'),
  ('Tiler and Flooring', 'Marble and granite', 'تركيب وتلميع رخام وجرانيت'),
  ('Tiler and Flooring', 'Parquet and laminate flooring', 'تركيب باركيه ولامينيت'),
  ('Tiler and Flooring', 'Tile repair', 'إصلاح وتغيير بلاط'),

  ('Mason and Plasterer', 'Brickwork and building', 'أعمال بناء وطوب'),
  ('Mason and Plasterer', 'Plastering', 'أعمال محارة'),
  ('Mason and Plasterer', 'Concrete work', 'أعمال خرسانة'),
  ('Mason and Plasterer', 'Demolition and breaking', 'أعمال هدم وتكسير'),
  ('Mason and Plasterer', 'Minor renovations', 'ترميمات بسيطة'),

  ('Gypsum and False Ceiling', 'False ceilings', 'تركيب أسقف معلقة'),
  ('Gypsum and False Ceiling', 'Gypsum partition walls', 'حوائط جيبس بورد'),
  ('Gypsum and False Ceiling', 'Decorative cornices and lighting niches', 'كرانيش وفتحات إضاءة'),

  ('Aluminum and Glass', 'Aluminum windows and doors', 'تركيب وإصلاح شبابيك وأبواب ألوميتال'),
  ('Aluminum and Glass', 'Shower cabins and glass partitions', 'كبائن دش وقواطع زجاج'),
  ('Aluminum and Glass', 'Glass repair and replacement', 'إصلاح وتغيير الزجاج'),
  ('Aluminum and Glass', 'Mosquito screens', 'تركيب سلك ناموسية'),

  ('Blacksmith and Welder', 'Iron gates and doors', 'تصنيع وتركيب بوابات وأبواب حديد'),
  ('Blacksmith and Welder', 'Window grills and railings', 'شبابيك حماية وسلالم وحواجز'),
  ('Blacksmith and Welder', 'Welding and metal repair', 'لحام وإصلاح معادن'),

  ('Locksmith', 'Open a locked door', 'فتح باب مغلق'),
  ('Locksmith', 'Replace or install locks', 'تغيير وتركيب أقفال'),
  ('Locksmith', 'Key duplication', 'نسخ مفاتيح'),
  ('Locksmith', 'Safe opening', 'فتح خزن'),

  ('Waterproofing and Insulation', 'Roof waterproofing', 'عزل أسطح'),
  ('Waterproofing and Insulation', 'Bathroom and kitchen waterproofing', 'عزل حمامات ومطابخ'),
  ('Waterproofing and Insulation', 'Thermal insulation', 'عزل حراري'),
  ('Waterproofing and Insulation', 'Damp and leak treatment', 'علاج الرطوبة والتسريبات'),

  ('Appliance Repair', 'Washing machine repair', 'صيانة غسالات'),
  ('Appliance Repair', 'Refrigerator and freezer repair', 'صيانة ثلاجات وفريزر'),
  ('Appliance Repair', 'Oven and cooker repair', 'صيانة بوتاجاز وأفران'),
  ('Appliance Repair', 'Dishwasher repair', 'صيانة غسالات أطباق'),
  ('Appliance Repair', 'Water dispenser repair', 'صيانة مبردات مياه'),
  ('Appliance Repair', 'Microwave repair', 'صيانة ميكروويف'),
  ('Appliance Repair', 'Small appliances repair', 'صيانة أجهزة منزلية صغيرة'),

  ('Air Conditioning', 'AC installation', 'تركيب تكييف'),
  ('Air Conditioning', 'AC repair', 'إصلاح تكييف'),
  ('Air Conditioning', 'AC cleaning and maintenance', 'تنظيف وصيانة دورية للتكييف'),
  ('Air Conditioning', 'Freon gas refill', 'تعبئة فريون'),

  ('Gas Technician', 'Natural gas installation', 'تركيب غاز طبيعي'),
  ('Gas Technician', 'Gas leak repair', 'إصلاح تسريب غاز'),
  ('Gas Technician', 'Connect stoves and heaters', 'توصيل بوتاجاز وسخانات غاز'),

  ('Water Filter and Tank', 'Water filter installation', 'تركيب فلاتر مياه'),
  ('Water Filter and Tank', 'Filter maintenance and cartridge change', 'صيانة وتغيير شمعات الفلاتر'),
  ('Water Filter and Tank', 'Water tank cleaning', 'غسيل وتعقيم خزانات مياه'),

  ('TV and Electronics', 'TV repair', 'إصلاح تلفزيون'),
  ('TV and Electronics', 'TV wall mounting', 'تعليق تلفزيون على الحائط'),
  ('TV and Electronics', 'Satellite dish and receiver installation', 'تركيب دش وريسيفر'),
  ('TV and Electronics', 'CCTV camera installation', 'تركيب كاميرات مراقبة'),
  ('TV and Electronics', 'Sound system and home theater setup', 'تركيب أنظمة صوت'),

  ('Computer and Network', 'Laptop and desktop repair', 'صيانة لابتوب وكمبيوتر'),
  ('Computer and Network', 'Wi-Fi and router setup', 'تركيب وضبط واي فاي وراوتر'),
  ('Computer and Network', 'Printer setup and repair', 'تركيب وصيانة طابعات'),
  ('Computer and Network', 'Virus removal and software install', 'إزالة فيروسات وتثبيت برامج'),

  ('Solar Panels', 'Solar panel installation', 'تركيب ألواح طاقة شمسية'),
  ('Solar Panels', 'Solar maintenance and cleaning', 'صيانة وتنظيف ألواح الطاقة الشمسية'),
  ('Solar Panels', 'Solar water heater installation', 'تركيب سخان شمسي'),

  ('Handyman', 'Hang shelves, pictures and curtains', 'تعليق أرفف وصور وستائر'),
  ('Handyman', 'Minor home repairs', 'إصلاحات منزلية بسيطة'),
  ('Handyman', 'Fix doors, hinges and handles', 'إصلاح أبواب ومفصلات ومقابض'),
  ('Handyman', 'Assemble furniture', 'تجميع أثاث'),

  ('Pest Control', 'Cockroaches and insects', 'مكافحة صراصير وحشرات'),
  ('Pest Control', 'Rodent control', 'مكافحة قوارض'),
  ('Pest Control', 'Bed bug treatment', 'مكافحة بق الفراش'),
  ('Pest Control', 'Termite control', 'مكافحة النمل الأبيض'),

  ('Gardener', 'Lawn and garden care', 'العناية بالحدائق والنجيل'),
  ('Gardener', 'Planting and landscaping', 'زراعة وتنسيق حدائق'),
  ('Gardener', 'Tree and hedge trimming', 'تقليم الأشجار والأسوار النباتية'),
  ('Gardener', 'Irrigation system installation', 'تركيب شبكات ري'),

  ('Pool Maintenance', 'Pool cleaning', 'تنظيف حمامات سباحة'),
  ('Pool Maintenance', 'Pool pump and filter repair', 'صيانة مضخات وفلاتر حمامات السباحة'),
  ('Pool Maintenance', 'Pool water treatment', 'معالجة مياه حمامات السباحة'),

  ('Upholsterer', 'Sofa and chair reupholstery', 'تنجيد كنب وكراسي'),
  ('Upholsterer', 'Mattress renovation', 'تجديد مراتب'),
  ('Upholsterer', 'Curtain installation', 'تركيب ستائر'),

  ('Tailor', 'Clothing alterations', 'تعديل ملابس'),
  ('Tailor', 'Custom tailoring', 'تفصيل ملابس'),
  ('Tailor', 'Curtain and bedding sewing', 'تفصيل ستائر ومفروشات'),

  ('Hairdresser', 'Haircut and styling', 'قص وتصفيف الشعر'),
  ('Hairdresser', 'Blow-dry', 'سشوار'),
  ('Hairdresser', 'Hair coloring', 'صبغ الشعر'),
  ('Hairdresser', 'Hair treatments', 'علاجات الشعر (بروتين وكيراتين)'),
  ('Hairdresser', 'Bridal hairstyle', 'تسريحة عروس'),

  ('Barber', 'Haircut for men', 'قص شعر رجالي'),
  ('Barber', 'Beard trim and shave', 'تهذيب وحلاقة الذقن'),
  ('Barber', 'Kids haircut', 'قص شعر أطفال'),
  ('Barber', 'Hair coloring for men', 'صبغ شعر رجالي'),
  ('Barber', 'Facial and skin care for men', 'عناية بالبشرة والشعر للرجال'),

  ('Beautician', 'Manicure and pedicure', 'مانيكير وباديكير'),
  ('Beautician', 'Waxing and hair removal', 'إزالة الشعر (واكس)'),
  ('Beautician', 'Facial and skin care', 'تنظيف بشرة وعناية'),
  ('Beautician', 'Henna', 'حنة'),
  ('Beautician', 'Eyebrow and eyelash services', 'خدمات الحواجب والرموش'),

  ('Makeup Artist', 'Party makeup', 'مكياج سهرة'),
  ('Makeup Artist', 'Bridal makeup', 'مكياج عروس'),
  ('Makeup Artist', 'Photoshoot makeup', 'مكياج جلسات تصوير'),

  ('Cook', 'Home cooking', 'طبخ منزلي'),
  ('Cook', 'Weekly meal preparation', 'تحضير وجبات أسبوعية'),
  ('Cook', 'Baking and desserts', 'مخبوزات وحلويات'),
  ('Cook', 'Cooking for family gatherings', 'طبخ لتجمعات عائلية'),

  ('Caterer', 'Event catering', 'تجهيز حفلات ومناسبات'),
  ('Caterer', 'Buffet setup and service', 'تجهيز وخدمة بوفيه'),
  ('Caterer', 'Serving staff and waiters', 'عمال ضيافة وندل'),
  ('Caterer', 'Corporate catering', 'تجهيز وجبات شركات'),

  ('Nanny', 'Childcare at home', 'رعاية أطفال بالمنزل'),
  ('Nanny', 'Newborn care', 'رعاية حديثي الولادة'),
  ('Nanny', 'Evening babysitting', 'جليسة أطفال مسائية'),
  ('Nanny', 'School pickup and homework help', 'توصيل من المدرسة ومساعدة في الواجبات'),

  ('Caregiver', 'Elderly care', 'رعاية كبار السن'),
  ('Caregiver', 'Patient companion', 'مرافقة مرضى'),
  ('Caregiver', 'Overnight care', 'رعاية ليلية'),

  ('Home Nurse', 'Injections and medication', 'إعطاء حقن وأدوية'),
  ('Home Nurse', 'Wound dressing', 'تغيير جروح وضمادات'),
  ('Home Nurse', 'Vital signs monitoring', 'قياس العلامات الحيوية'),
  ('Home Nurse', 'Post-surgery home care', 'رعاية منزلية بعد العمليات'),

  ('Driver', 'Private driver', 'سائق خاص'),
  ('Driver', 'Delivery driver', 'سائق توصيل'),
  ('Driver', 'Airport transfer', 'توصيل من وإلى المطار'),
  ('Driver', 'Truck or pickup driver', 'سائق نقل'),

  ('Mover', 'Full home moving', 'نقل منزل كامل'),
  ('Mover', 'Packing and wrapping', 'تغليف وتعبئة'),
  ('Mover', 'Furniture disassembly and assembly', 'فك وتركيب الأثاث'),
  ('Mover', 'Loading and unloading', 'تحميل وتنزيل'),

  ('Car Mechanic', 'Engine diagnosis and repair', 'فحص وإصلاح المحرك'),
  ('Car Mechanic', 'Oil and filter change', 'تغيير زيت وفلاتر'),
  ('Car Mechanic', 'Brake repair', 'إصلاح فرامل'),
  ('Car Mechanic', 'Battery replacement', 'تغيير بطارية'),
  ('Car Mechanic', 'Roadside assistance', 'مساعدة على الطريق'),

  ('Car Washer', 'Exterior car wash', 'غسيل خارجي للسيارة'),
  ('Car Washer', 'Interior car cleaning', 'تنظيف داخلي للسيارة'),
  ('Car Washer', 'Polish and detailing', 'تلميع وتجميل السيارة'),

  ('Security Guard', 'Building or home guard', 'حراسة مبنى أو منزل'),
  ('Security Guard', 'Event security', 'تأمين مناسبات'),
  ('Security Guard', 'Doorman', 'بواب'),

  ('Private Tutor', 'Math and science tutoring', 'دروس رياضيات وعلوم'),
  ('Private Tutor', 'Arabic and Quran tutoring', 'دروس لغة عربية وقرآن'),
  ('Private Tutor', 'English and other languages tutoring', 'دروس إنجليزي ولغات'),
  ('Private Tutor', 'Primary school homework help', 'مساعدة في مذاكرة المرحلة الابتدائية')
) as v(profession_en, name_en, name_ar)
join public.professions p on p.name_en = v.profession_en
where not exists (
  select 1 from public.task_types t
  where t.profession_id = p.id and t.name_en = v.name_en
);
