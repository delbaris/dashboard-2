/* =====================================================================
   PMO Command Center — Demo Data Layer
   ===================================================================== */
(function () {
  'use strict';

  // Deterministic PRNG so the demo is stable across reloads
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20250928);

  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
  const daysAhead = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

  // ----------------------------------------------------------------
  // USERS
  // ----------------------------------------------------------------
  const users = [
    { id: 'U-001', username: 'ceo',     password: '123456', name: 'علیرضا مهرابی (مدیرعامل)', role: 'CEO',             dataScope: 'All Organization', email: 'ceo@parsai.ir',     color: '#4f46e5' },
    { id: 'U-002', username: 'manager', password: '123456', name: 'امید تهرانی',            role: 'Project Manager',  dataScope: 'Assigned Projects', email: 'o.tehrani@parsai.ir', color: '#12b76a' },
    { id: 'U-003', username: 'hr',      password: '123456', name: 'حسن یوسفی',              role: 'HR',               dataScope: 'All Organization', email: 'h.yousefi@parsai.ir', color: '#f79009' },
    { id: 'U-004', username: 'user',    password: '123456', name: 'سعید احمدی',             role: 'Employee',         dataScope: 'Own Data',         email: 's.ahmadi@parsai.ir',  color: '#2e90fa' }
  ];

  // ----------------------------------------------------------------
  // EMPLOYEES
  // ----------------------------------------------------------------
  const employees = [
    {
      id: 'E-001', personnelCode: '1001', nationalId: '0012345678',
      firstName: 'سعید', lastName: 'احمدی',
      email: 's.ahmadi@parsai.ir', phone: '0912-111-0001',
      office: 'تهران', country: 'ایران', orgUnit: 'مهندسی نرم‌افزار',
      position: 'Senior Python Engineer', employmentType: 'Full-time',
      startDate: '2022-03-15', endDate: null, status: 'Active', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 18,
      skills: [
        { name: 'Python', level: 5, exp: 7 }, { name: 'FastAPI', level: 4, exp: 5 },
        { name: 'LLM', level: 4, exp: 3 }, { name: 'RAG', level: 3, exp: 2 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1400, taxableBenefits: 210, nonTaxableBenefits: 130, deductions: 260 }
    },
    {
      id: 'E-002', personnelCode: '1002', nationalId: '0023456789',
      firstName: 'مریم', lastName: 'رضایی',
      email: 'm.rezaei@parsai.ir', phone: '0912-111-0002',
      office: 'تهران', country: 'ایران', orgUnit: 'هوش مصنوعی',
      position: 'AI / ML Engineer', employmentType: 'Full-time',
      startDate: '2021-08-01', endDate: null, status: 'Active', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 20,
      skills: [
        { name: 'Python', level: 5, exp: 6 }, { name: 'LLM', level: 5, exp: 4 },
        { name: 'RAG', level: 4, exp: 3 }, { name: 'PyTorch', level: 4, exp: 5 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1650, taxableBenefits: 240, nonTaxableBenefits: 150, deductions: 320 }
    },
    {
      id: 'E-003', personnelCode: '1003', nationalId: '0034567890',
      firstName: 'علی', lastName: 'کریمی',
      email: 'a.karimi@parsai.ir', phone: '0912-111-0003',
      office: 'تهران', country: 'ایران', orgUnit: 'مهندسی نرم‌افزار',
      position: 'Backend Engineer (.NET)', employmentType: 'Full-time',
      startDate: '2023-01-10', endDate: null, status: 'Active', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 16,
      skills: [
        { name: '.NET', level: 5, exp: 6 }, { name: 'SQL Server', level: 4, exp: 5 },
        { name: 'FastAPI', level: 3, exp: 2 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1250, taxableBenefits: 180, nonTaxableBenefits: 110, deductions: 220 }
    },
    {
      id: 'E-004', personnelCode: '1004', nationalId: '0045678901',
      firstName: 'نگار', lastName: 'موسوی',
      email: 'n.mousavi@parsai.ir', phone: '0912-111-0004',
      office: 'تهران', country: 'ایران', orgUnit: 'محصول و تجربه کاربری',
      position: 'Frontend Engineer (React)', employmentType: 'Full-time',
      startDate: '2022-06-20', endDate: null, status: 'Active', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 15,
      skills: [
        { name: 'React', level: 5, exp: 5 }, { name: 'JavaScript', level: 5, exp: 6 },
        { name: 'UI/UX', level: 3, exp: 3 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1180, taxableBenefits: 170, nonTaxableBenefits: 100, deductions: 200 }
    },
    {
      id: 'E-005', personnelCode: '1005', nationalId: '0056789012',
      firstName: 'رضا', lastName: 'حسینی',
      email: 'r.hosseini@parsai.ir', phone: '050-222-0005',
      office: 'دبی', country: 'امارات', orgUnit: 'زیرساخت و DevOps',
      position: 'DevOps Engineer', employmentType: 'Full-time',
      startDate: '2021-11-05', endDate: null, status: 'Active', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 22,
      skills: [
        { name: 'DevOps', level: 5, exp: 7 }, { name: 'Kubernetes', level: 5, exp: 5 },
        { name: 'Python', level: 3, exp: 3 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1950, taxableBenefits: 280, nonTaxableBenefits: 180, deductions: 380 }
    },
    {
      id: 'E-006', personnelCode: '1006', nationalId: '0067890123',
      firstName: 'سارا', lastName: 'نادری',
      email: 's.naderi@parsai.ir', phone: '0912-111-0006',
      office: 'تهران', country: 'ایران', orgUnit: 'محصول و تجربه کاربری',
      position: 'Product Designer', employmentType: 'Full-time',
      startDate: '2022-10-01', endDate: null, status: 'Active', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 14,
      skills: [
        { name: 'UI/UX', level: 5, exp: 6 }, { name: 'Figma', level: 5, exp: 5 },
        { name: 'Design System', level: 4, exp: 4 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1100, taxableBenefits: 160, nonTaxableBenefits: 90, deductions: 190 }
    },
    {
      id: 'E-007', personnelCode: '1007', nationalId: '0078901234',
      firstName: 'امید', lastName: 'تهرانی',
      email: 'o.tehrani@parsai.ir', phone: '0912-111-0007',
      office: 'تهران', country: 'ایران', orgUnit: 'مدیریت پروژه',
      position: 'Senior Project Manager', employmentType: 'Full-time',
      startDate: '2020-05-01', endDate: null, status: 'Active', managerId: null,
      weeklyCapacity: 40, hourlyCost: 24,
      skills: [
        { name: 'Project Management', level: 5, exp: 9 },
        { name: 'Agile / Scrum', level: 5, exp: 8 },
        { name: 'Business Analysis', level: 4, exp: 5 }
      ],
      payroll: { daysWorked: 30, baseSalary: 2100, taxableBenefits: 320, nonTaxableBenefits: 200, deductions: 420 }
    },
    {
      id: 'E-008', personnelCode: '1008', nationalId: '0089012345',
      firstName: 'فاطمه', lastName: 'صادقی',
      email: 'f.sadeghi@parsai.ir', phone: '0912-111-0008',
      office: 'تهران', country: 'ایران', orgUnit: 'تضمین کیفیت',
      position: 'QA Engineer', employmentType: 'Full-time',
      startDate: '2023-03-01', endDate: null, status: 'Active', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 12,
      skills: [
        { name: 'QA', level: 5, exp: 5 }, { name: 'Automation', level: 4, exp: 4 },
        { name: 'Python', level: 3, exp: 2 }
      ],
      payroll: { daysWorked: 30, baseSalary: 980, taxableBenefits: 140, nonTaxableBenefits: 80, deductions: 160 }
    },
    {
      id: 'E-009', personnelCode: '1009', nationalId: 'EX-1009',
      firstName: 'Arjun', lastName: 'Mehta',
      email: 'a.mehta@parsai.ir', phone: '050-222-0009',
      office: 'دبی', country: 'هند', orgUnit: 'مهندسی نرم‌افزار',
      position: 'Python Engineer', employmentType: 'Full-time',
      startDate: '2023-06-15', endDate: null, status: 'Active', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 19,
      skills: [
        { name: 'Python', level: 5, exp: 6 }, { name: 'FastAPI', level: 4, exp: 4 },
        { name: 'LLM', level: 3, exp: 2 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1500, taxableBenefits: 220, nonTaxableBenefits: 140, deductions: 280 }
    },
    {
      id: 'E-010', personnelCode: '1010', nationalId: 'EX-1010',
      firstName: 'Priya', lastName: 'Sharma',
      email: 'p.sharma@parsai.ir', phone: '050-222-0010',
      office: 'دبی', country: 'هند', orgUnit: 'داده و تحلیل',
      position: 'Data Engineer', employmentType: 'Full-time',
      startDate: daysAgo(18), endDate: null, status: 'Onboarding', managerId: 'E-007',
      weeklyCapacity: 40, hourlyCost: 21,
      skills: [
        { name: 'Python', level: 4, exp: 5 }, { name: 'SQL', level: 5, exp: 6 },
        { name: 'Data Pipeline', level: 4, exp: 4 }
      ],
      payroll: { daysWorked: 12, baseSalary: 1700, taxableBenefits: 250, nonTaxableBenefits: 160, deductions: 320 }
    },
    {
      id: 'E-011', personnelCode: '1011', nationalId: '0111223344',
      firstName: 'حسن', lastName: 'یوسفی',
      email: 'h.yousefi@parsai.ir', phone: '0912-111-0011',
      office: 'تهران', country: 'ایران', orgUnit: 'سرمایه انسانی',
      position: 'HR Specialist', employmentType: 'Full-time',
      startDate: '2022-02-01', endDate: null, status: 'Active', managerId: null,
      weeklyCapacity: 40, hourlyCost: 13,
      skills: [
        { name: 'Recruitment', level: 5, exp: 6 }, { name: 'HR Operations', level: 4, exp: 5 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1050, taxableBenefits: 150, nonTaxableBenefits: 90, deductions: 180 }
    },
    {
      id: 'E-012', personnelCode: '1012', nationalId: '0122334455',
      firstName: 'لیلا', lastName: 'اکبری',
      email: 'l.akbari@parsai.ir', phone: '0912-111-0012',
      office: 'تهران', country: 'ایران', orgUnit: 'تحلیل کسب‌وکار',
      position: 'Business Analyst', employmentType: 'Full-time',
      startDate: '2021-04-15', endDate: daysAhead(14), status: 'Offboarding', managerId: 'E-007',
      weeklyCapacity: 20, hourlyCost: 17,
      skills: [
        { name: 'Business Analysis', level: 5, exp: 7 }, { name: 'SQL', level: 4, exp: 5 }
      ],
      payroll: { daysWorked: 30, baseSalary: 1350, taxableBenefits: 200, nonTaxableBenefits: 120, deductions: 250 }
    }
  ];

  // ----------------------------------------------------------------
  // PROJECTS
  // ----------------------------------------------------------------
  const projects = [
    {
      id: 'P-001', code: 'PRJ-001', name: 'سامانه چت‌بات هوشمند بانک',
      client: 'بانک ملت', ownerId: 'E-007', pmId: 'E-007',
      status: 'On Track', progress: 68, health: 'Healthy',
      startDate: daysAgo(120), endDate: daysAhead(60),
      timeBudget: 1200, financialBudget: 180000
    },
    {
      id: 'P-002', code: 'PRJ-002', name: 'پلتفرم RAG اسناد سازمانی',
      client: 'شرکت ملی نفت', ownerId: 'E-007', pmId: 'E-007',
      status: 'At Risk', progress: 42, health: 'Warning',
      startDate: daysAgo(150), endDate: daysAhead(20),
      timeBudget: 1600, financialBudget: 220000
    },
    {
      id: 'P-003', code: 'PRJ-003', name: 'Agent فروش خودکار',
      client: 'دیجی‌کالا', ownerId: 'E-007', pmId: 'E-002',
      status: 'Delayed', progress: 35, health: 'Critical',
      startDate: daysAgo(180), endDate: daysAgo(15),
      timeBudget: 1400, financialBudget: 160000
    },
    {
      id: 'P-004', code: 'PRJ-004', name: 'داشبورد BI مدیریتی',
      client: 'بیمه پاسارگاد', ownerId: 'E-007', pmId: 'E-007',
      status: 'On Track', progress: 75, health: 'Healthy',
      startDate: daysAgo(90), endDate: daysAhead(30),
      timeBudget: 800, financialBudget: 95000
    },
    {
      id: 'P-005', code: 'PRJ-005', name: 'موتور جستجوی معنایی',
      client: 'همراه اول', ownerId: 'E-007', pmId: 'E-007',
      status: 'Planning', progress: 8, health: 'Healthy',
      startDate: daysAgo(20), endDate: daysAhead(150),
      timeBudget: 1800, financialBudget: 240000
    },
    {
      id: 'P-006', code: 'PRJ-006', name: 'سیستم توصیه‌گر محتوا',
      client: 'فیلیمو', ownerId: 'E-007', pmId: 'E-002',
      status: 'Completed', progress: 100, health: 'Healthy',
      startDate: daysAgo(300), endDate: daysAgo(45),
      timeBudget: 900, financialBudget: 120000
    }
  ];

  // ----------------------------------------------------------------
  // TASKS  (26 items)
  // ----------------------------------------------------------------
  const T = (id, projectId, phase, wp, code, title, assigneeId, status, priority, estimate, actual, progress, deadline, dep) => ({
    id, projectId, phase, workPackage: wp, code, title, assigneeId,
    status, priority, estimate, actual, progress, deadline, dependency: dep || null,
    dod: 'تست شده، مستندسازی شده و توسط مسئول فنی تأیید شده',
    history: [{ date: daysAgo(20), status: 'Todo', by: 'سیستم' }, { date: daysAgo(10), status, by: 'کاربر' }]
  });

  const tasks = [
    // PRJ-001
    T('T-001','P-001','فاز ۱ - تحلیل','WP-1.1','TSK-001','جمع‌آوری نیازمندی‌های چت‌بات','E-012','Done',       'High',   40, 42, 100, daysAgo(60)),
    T('T-002','P-001','فاز ۲ - طراحی','WP-2.1','TSK-002','طراحی معماری میکروسرویس','E-007','Done','High',60,58,100,daysAgo(45)),
    T('T-003','P-001','فاز ۳ - پیاده‌سازی','WP-3.1','TSK-003','پیاده‌سازی API گفتگو','E-001','In Progress','High',80,55,68,daysAhead(10)),
    T('T-004','P-001','فاز ۳ - پیاده‌سازی','WP-3.2','TSK-004','اتصال به LLM','E-002','In Progress','High',60,40,65,daysAhead(12)),
    T('T-005','P-001','فاز ۳ - پیاده‌سازی','WP-3.3','TSK-005','طراحی UI چت','E-004','Review','Medium',50,45,90,daysAhead(6)),
    T('T-006','P-001','فاز ۴ - تست','WP-4.1','TSK-006','تست یکپارچگی','E-008','Todo','Medium',40,0,0,daysAhead(20)),
    // PRJ-002
    T('T-007','P-002','فاز ۱ - تحلیل','WP-1.1','TSK-007','بررسی اسناد سازمانی','E-012','Done','High',50,52,100,daysAgo(90)),
    T('T-008','P-002','فاز ۲ - طراحی','WP-2.1','TSK-008','طراحی معماری RAG','E-002','Done','High',70,75,100,daysAgo(60)),
    T('T-009','P-002','فاز ۳ - پیاده‌سازی','WP-3.1','TSK-009','پیاده‌سازی Vector Store','E-001','In Progress','High',90,80,60,daysAhead(5)),
    T('T-010','P-002','فاز ۳ - پیاده‌سازی','WP-3.2','TSK-010','Pipeline استخراج متن','E-009','In Progress','High',70,50,55,daysAhead(8)),
    T('T-011','P-002','فاز ۳ - پیاده‌سازی','WP-3.3','TSK-011','Embedding Service','E-002','Blocked','High',60,35,40,daysAhead(4)),
    T('T-012','P-002','فاز ۴ - تست','WP-4.1','TSK-012','ارزیابی دقت RAG','E-008','Todo','High',50,0,0,daysAhead(18)),
    // PRJ-003
    T('T-013','P-003','فاز ۱ - تحلیل','WP-1.1','TSK-013','تحلیل فرآیند فروش','E-012','Done','High',40,45,100,daysAgo(120)),
    T('T-014','P-003','فاز ۲ - طراحی','WP-2.1','TSK-014','طراحی Agent Flow','E-002','Done','High',60,65,100,daysAgo(80)),
    T('T-015','P-003','فاز ۳ - پیاده‌سازی','WP-3.1','TSK-015','توسعه Agent Core','E-001','Blocked','High',100,90,50,daysAgo(10)),
    T('T-016','P-003','فاز ۳ - پیاده‌سازی','WP-3.2','TSK-016','اتصال به CRM','E-009','In Progress','High',70,40,45,daysAgo(5)),
    T('T-017','P-003','فاز ۳ - پیاده‌سازی','WP-3.3','TSK-017','پنل مدیریت','E-004','Todo','Medium',60,10,15,daysAhead(15)),
    T('T-018','P-003','فاز ۴ - تست','WP-4.1','TSK-018','تست سناریوهای فروش','E-008','Todo','High',40,0,0,daysAhead(5)),
    // PRJ-004
    T('T-019','P-004','فاز ۱ - تحلیل','WP-1.1','TSK-019','تعریف KPIهای مدیریتی','E-007','Done','High',30,32,100,daysAgo(70)),
    T('T-020','P-004','فاز ۲ - پیاده‌سازی','WP-2.1','TSK-020','ETL داده‌های بیمه','E-003','In Progress','High',80,60,72,daysAhead(8)),
    T('T-021','P-004','فاز ۲ - پیاده‌سازی','WP-2.2','TSK-021','داشبورد React','E-004','Review','High',70,65,92,daysAhead(4)),
    T('T-022','P-004','فاز ۳ - تست','WP-3.1','TSK-022','تست عملکرد داشبورد','E-008','Todo','Medium',30,0,0,daysAhead(16)),
    // PRJ-005
    T('T-023','P-005','فاز ۱ - تحلیل','WP-1.1','TSK-023','تحقیق موتور جستجو','E-002','In Progress','Medium',60,20,25,daysAhead(30)),
    T('T-024','P-005','فاز ۲ - طراحی','WP-2.1','TSK-024','طراحی معماری اولیه','E-007','Todo','Medium',50,0,0,daysAhead(45)),
    // PRJ-006
    T('T-025','P-006','فاز ۱ - پیاده‌سازی','WP-1.1','TSK-025','توسعه مدل توصیه‌گر','E-002','Done','High',90,95,100,daysAgo(60)),
    T('T-026','P-006','فاز ۲ - تحویل','WP-2.1','TSK-026','تحویل نهایی','E-007','Done','High',20,18,100,daysAgo(45))
  ];

  // ----------------------------------------------------------------
  // CANDIDATES  (8)
  // ----------------------------------------------------------------
  const candidates = [
    { id:'C-001', name:'محمد رضایی',     contact:'m.rezaei@gmail.com',       source:'JobVision',        position:'Python Engineer',    skills:['Python','FastAPI'],            status:'Interview',  createdDate: daysAgo(22), ownerId:'E-011' },
    { id:'C-002', name:'زهرا کاظمی',     contact:'z.kazemi@gmail.com',      source:'LinkedIn',         position:'AI Engineer',        skills:['LLM','PyTorch'],               status:'Evaluation', createdDate: daysAgo(30), ownerId:'E-011' },
    { id:'C-003', name:'رضا محمدی',      contact:'r.mohammadi@gmail.com',   source:'Referral',         position:'.NET Developer',     skills:['.NET','SQL Server'],           status:'Decision',   createdDate: daysAgo(40), ownerId:'E-011' },
    { id:'C-004', name:'Sneha Iyer',     contact:'sneha.iyer@gmail.com',    source:'Recruitment Agency', position:'Data Engineer',      skills:['Python','Spark'],              status:'Interview',  createdDate: daysAgo(18), ownerId:'E-011' },
    { id:'C-005', name:'نگین شریفی',      contact:'n.sharifi@gmail.com',     source:'Website',          position:'QA Engineer',        skills:['QA','Automation'],             status:'Accepted',   createdDate: daysAgo(55), ownerId:'E-011' },
    { id:'C-006', name:'Karan Patel',    contact:'karan.patel@gmail.com',   source:'LinkedIn',         position:'DevOps Engineer',    skills:['DevOps','Kubernetes'],         status:'Interview',  createdDate: daysAgo(12), ownerId:'E-011' },
    { id:'C-007', name:'پوریا احمدی',     contact:'p.ahmadi@gmail.com',      source:'Direct Application',position:'Frontend Engineer',  skills:['React','JavaScript'],          status:'Screening',  createdDate: daysAgo(6),  ownerId:'E-011' },
    { id:'C-008', name:'Maya Kapoor',    contact:'maya.kapoor@gmail.com',   source:'JobVision',        position:'Product Designer',   skills:['Figma','UI/UX'],               status:'Rejected',   createdDate: daysAgo(60), ownerId:'E-011' }
  ];

  // ----------------------------------------------------------------
  // INTERVIEWS
  // ----------------------------------------------------------------
  const interviews = [
    { id:'I-001', candidateId:'C-001', type:'Technical',   interviewerId:'E-001', date: daysAgo(10), score: 78, result:'Pass',  notes:'دانش Python خوب', strengths:'مبانی قوی', concerns:'تجربه LLM محدود', recommendation:'ادامه فرآیند' },
    { id:'I-002', candidateId:'C-002', type:'Technical',   interviewerId:'E-002', date: daysAgo(15), score: 88, result:'Pass',  notes:'تجربه قوی در LLM', strengths:'پروژه‌های مرتبط', concerns:'حقوق بالا', recommendation:'پیشنهاد جذب' },
    { id:'I-003', candidateId:'C-002', type:'Managerial',  interviewerId:'E-007', date: daysAgo(8),  score: 85, result:'Pass',  notes:'', strengths:'کار تیمی', concerns:'—', recommendation:'تأیید' },
    { id:'I-004', candidateId:'C-003', type:'Technical',   interviewerId:'E-003', date: daysAgo(20), score: 82, result:'Pass',  notes:'', strengths:'تجربه .NET', concerns:'آشنایی کمتر با Cloud', recommendation:'ادامه' },
    { id:'I-005', candidateId:'C-004', type:'Technical',   interviewerId:'E-005', date: daysAgo(6),  score: 80, result:'Pass',  notes:'', strengths:'تجربه Spark', concerns:'زبان فارسی محدود', recommendation:'ادامه' },
    { id:'I-006', candidateId:'C-005', type:'HR',          interviewerId:'E-011', date: daysAgo(30), score: 90, result:'Pass',  notes:'', strengths:'ارتباط عالی', concerns:'—', recommendation:'استخدام' },
    { id:'I-007', candidateId:'C-006', type:'Technical',   interviewerId:'E-005', date: daysAgo(3),  score: 84, result:'Pass',  notes:'', strengths:'Kubernetes', concerns:'—', recommendation:'ادامه' },
    { id:'I-008', candidateId:'C-008', type:'Behavioral',  interviewerId:'E-011', date: daysAgo(45), score: 45, result:'Fail',  notes:'عدم تناسب', strengths:'—', concerns:'عدم تطابق فرهنگی', recommendation:'رد' }
  ];

  // ----------------------------------------------------------------
  // ASSIGNMENTS
  // ----------------------------------------------------------------
  const assignments = [
    { id:'A-001', employeeId:'E-001', projectId:'P-001', role:'Backend Lead',   start: daysAgo(120), end: daysAhead(60),  allocation: 60, plannedHours: 400, actualHours: 320, status:'Active' },
    { id:'A-002', employeeId:'E-001', projectId:'P-002', role:'Python Engineer',start: daysAgo(90),  end: daysAhead(20),  allocation: 30, plannedHours: 240, actualHours: 210, status:'Active' },
    { id:'A-003', employeeId:'E-001', projectId:'P-003', role:'Agent Developer',start: daysAgo(60),  end: daysAhead(10),  allocation: 20, plannedHours: 160, actualHours: 150, status:'Active' },
    { id:'A-004', employeeId:'E-002', projectId:'P-001', role:'AI Engineer',    start: daysAgo(120), end: daysAhead(60),  allocation: 50, plannedHours: 350, actualHours: 290, status:'Active' },
    { id:'A-005', employeeId:'E-002', projectId:'P-002', role:'AI Lead',        start: daysAgo(90),  end: daysAhead(20),  allocation: 40, plannedHours: 300, actualHours: 260, status:'Active' },
    { id:'A-006', employeeId:'E-002', projectId:'P-005', role:'Researcher',     start: daysAgo(20),  end: daysAhead(150), allocation: 20, plannedHours: 120, actualHours: 25,  status:'Active' },
    { id:'A-007', employeeId:'E-003', projectId:'P-004', role:'Backend Engineer',start: daysAgo(90), end: daysAhead(30),  allocation: 70, plannedHours: 380, actualHours: 280, status:'Active' },
    { id:'A-008', employeeId:'E-003', projectId:'P-001', role:'Backend Support',start: daysAgo(60),  end: daysAhead(30),  allocation: 30, plannedHours: 180, actualHours: 140, status:'Active' },
    { id:'A-009', employeeId:'E-004', projectId:'P-001', role:'Frontend Lead',  start: daysAgo(120), end: daysAhead(60),  allocation: 55, plannedHours: 350, actualHours: 260, status:'Active' },
    { id:'A-010', employeeId:'E-004', projectId:'P-003', role:'Frontend Dev',   start: daysAgo(60),  end: daysAhead(15),  allocation: 25, plannedHours: 180, actualHours: 80,  status:'Active' },
    { id:'A-011', employeeId:'E-004', projectId:'P-004', role:'Frontend Dev',   start: daysAgo(60),  end: daysAhead(30),  allocation: 20, plannedHours: 150, actualHours: 140, status:'Active' },
    { id:'A-012', employeeId:'E-005', projectId:'P-001', role:'DevOps',         start: daysAgo(120), end: daysAhead(60),  allocation: 45, plannedHours: 300, actualHours: 240, status:'Active' },
    { id:'A-013', employeeId:'E-005', projectId:'P-003', role:'DevOps',         start: daysAgo(90),  end: daysAhead(10),  allocation: 35, plannedHours: 260, actualHours: 230, status:'Active' },
    { id:'A-014', employeeId:'E-005', projectId:'P-005', role:'Infra Lead',     start: daysAgo(20),  end: daysAhead(150), allocation: 30, plannedHours: 200, actualHours: 35,  status:'Active' },
    { id:'A-015', employeeId:'E-006', projectId:'P-001', role:'Product Designer',start: daysAgo(120),end: daysAhead(60),  allocation: 45, plannedHours: 280, actualHours: 230, status:'Active' },
    { id:'A-016', employeeId:'E-006', projectId:'P-003', role:'Designer',       start: daysAgo(90),  end: daysAhead(15),  allocation: 35, plannedHours: 250, actualHours: 175, status:'Active' },
    { id:'A-017', employeeId:'E-008', projectId:'P-001', role:'QA Engineer',    start: daysAgo(90),  end: daysAhead(60),  allocation: 50, plannedHours: 300, actualHours: 180, status:'Active' },
    { id:'A-018', employeeId:'E-008', projectId:'P-002', role:'QA Engineer',    start: daysAgo(80),  end: daysAhead(20),  allocation: 30, plannedHours: 200, actualHours: 130, status:'Active' },
    { id:'A-019', employeeId:'E-009', projectId:'P-002', role:'Python Engineer',start: daysAgo(70),  end: daysAhead(20),  allocation: 70, plannedHours: 400, actualHours: 260, status:'Active' },
    { id:'A-020', employeeId:'E-009', projectId:'P-003', role:'Python Engineer',start: daysAgo(60),  end: daysAhead(10),  allocation: 30, plannedHours: 180, actualHours: 130, status:'Active' },
    { id:'A-021', employeeId:'E-010', projectId:'P-005', role:'Data Engineer',  start: daysAgo(18),  end: daysAhead(150), allocation: 40, plannedHours: 240, actualHours: 25,  status:'Active' },
    { id:'A-022', employeeId:'E-012', projectId:'P-003', role:'Business Analyst',start: daysAgo(120),end: daysAhead(14),  allocation: 20, plannedHours: 100, actualHours: 90,  status:'Active' }
  ];

  // ----------------------------------------------------------------
  // TIME ENTRIES  (generated from assignments — approved / submitted / draft)
  // ----------------------------------------------------------------
  const timeEntries = [];
  let teSeq = 1;
  const statuses = ['Approved','Approved','Approved','Submitted','Draft','Approved','Rejected'];
  assignments.forEach((a) => {
    for (let i = 0; i < 26; i++) {
      if (rnd() < 0.45) continue;
      const d = daysAgo(i * 1 + Math.floor(rnd() * 2));
      const h = 2 + Math.round(rnd() * 5);
      const st = statuses[Math.floor(rnd() * statuses.length)];
      timeEntries.push({
        id: 'TE-' + String(teSeq++).padStart(4, '0'),
        employeeId: a.employeeId,
        projectId: a.projectId,
        taskId: null,
        date: d,
        hours: h,
        status: st,
        description: ''
      });
    }
  });

  // ----------------------------------------------------------------
  // INITIAL AUDIT LOG
  // ----------------------------------------------------------------
  const auditLog = [
    { id:'L-001', actor:'امید تهرانی', role:'Project Manager', timestamp: daysAgo(2)+'T10:15:00', action:'وضعیت پروژه تغییر کرد', entity:'Project', entityId:'P-002', source:'UI', reason:'تشخیص ریسک تأخیر', before:'On Track', after:'At Risk' },
    { id:'L-002', actor:'حسن یوسفی',  role:'HR',              timestamp: daysAgo(1)+'T09:05:00', action:'کارمند جدید ثبت شد',      entity:'Employee', entityId:'E-010', source:'UI', reason:'شروع Onboarding', before:'—', after:'Priya Sharma' },
    { id:'L-003', actor:'سیستم',       role:'System',          timestamp: daysAgo(1)+'T23:00:00', action:'هشدار تولید شد',           entity:'Alert', entityId:'time-P-003', source:'Rule Engine', reason:'مصرف زمان از پیشرفت جلو زده', before:'—', after:'High' },
    { id:'L-004', actor:'علیرضا مهرابی',role:'CEO',            timestamp: daysAgo(0)+'T08:30:00', action:'کارت داشبورد ویرایش شد',  entity:'Dashboard', entityId:'k4', source:'UI', reason:'افزودن نمایش ظرفیت', before:'hidden', after:'visible' }
  ];

  window.DEMO_DATA = {
    users, employees, projects, tasks, candidates, interviews, assignments, timeEntries, auditLog,
    offices: ['تهران', 'دبی'],
    orgUnits: ['مهندسی نرم‌افزار', 'هوش مصنوعی', 'محصول و تجربه کاربری', 'زیرساخت و DevOps', 'تضمین کیفیت', 'مدیریت پروژه', 'سرمایه انسانی', 'تحلیل کسب‌وکار', 'داده و تحلیل'],
    employmentTypes: ['Full-time', 'Part-time', 'Contract'],
    employeeStatuses: ['Active', 'Onboarding', 'Offboarding', 'Inactive'],
    projectStatuses: ['Planning', 'On Track', 'At Risk', 'Delayed', 'Completed'],
    taskStatuses: ['Todo', 'In Progress', 'Blocked', 'Review', 'Testing', 'Done'],
    taskPriorities: ['Low', 'Medium', 'High', 'Critical'],
    candidateSources: ['JobVision', 'LinkedIn', 'Referral', 'Website', 'Direct Application', 'Recruitment Agency'],
    candidateStatuses: ['Screening', 'Interview', 'Evaluation', 'Decision', 'Accepted', 'Rejected', 'Hired'],
    interviewTypes: ['Technical', 'Behavioral', 'Managerial', 'General', 'HR']
  };
})();