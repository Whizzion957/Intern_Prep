require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// CSE students from the batch - extracted from the image
const cseStudents = [
    { enrollmentNumber: '23114002', fullName: 'AASTIK BANSAL' },
    { enrollmentNumber: '23114003', fullName: 'ABDULLAH AZEEM' },
    { enrollmentNumber: '23114004', fullName: 'ADESH KADUBA PALKAR' },
    { enrollmentNumber: '23114005', fullName: 'ANIMESH KUMAR MAITREYA' },
    { enrollmentNumber: '23114006', fullName: 'ANKIT KUMAR' },
    { enrollmentNumber: '23114007', fullName: 'ANMOL GOKLANI' },
    { enrollmentNumber: '23114008', fullName: 'ANUSHKA JANGID' },
    { enrollmentNumber: '23114009', fullName: 'ARJUN GANESH' },
    { enrollmentNumber: '23114010', fullName: 'ARNAV GUPTA' },
    { enrollmentNumber: '23114011', fullName: 'ASHOK KUMAR MEENA' },
    { enrollmentNumber: '23114012', fullName: 'AYUSH VIJAYWAL' },
    { enrollmentNumber: '23114013', fullName: 'AYUSHKA GARG' },
    { enrollmentNumber: '23114014', fullName: 'BACHAWAR ATHARV YASHPAL' },
    { enrollmentNumber: '23114015', fullName: 'BAROT MAULIK HIRENKUMAR' },
    { enrollmentNumber: '23114016', fullName: 'BHOODEV MEENA' },
    { enrollmentNumber: '23114017', fullName: 'BIJILI SAMEETH' },
    { enrollmentNumber: '23114018', fullName: 'BIPIN MEENA' },
    { enrollmentNumber: '23114019', fullName: 'CHADIPIRALLA SONIKA' },
    { enrollmentNumber: '23114020', fullName: 'CHINNI SAI MOHAN' },
    { enrollmentNumber: '23114021', fullName: 'CHODIPALLI TEJ KIRAN SAI' },
    { enrollmentNumber: '23114022', fullName: 'DAIDIPYA MATHUR' },
    { enrollmentNumber: '23114023', fullName: 'DARSH JAIN' },
    { enrollmentNumber: '23114024', fullName: 'DEVANSH GUPTA' },
    { enrollmentNumber: '23114025', fullName: 'DRISHTI GARG' },
    { enrollmentNumber: '23114026', fullName: 'GADHIRAJU SAI LAKSHMI DEEKSHITA' },
    { enrollmentNumber: '23114027', fullName: 'GAURANSH GARG' },
    { enrollmentNumber: '23114028', fullName: 'GINJALA SRIVARDHAN' },
    { enrollmentNumber: '23114029', fullName: 'GITANJALI AGARWAL' },
    { enrollmentNumber: '23114030', fullName: 'GOLLAPALLE MAHENDRA REDDY' },
    { enrollmentNumber: '23114031', fullName: 'GORREPATI CHAITANYA KUMAR CHOWDAR' },
    { enrollmentNumber: '23114032', fullName: 'GUDDANTI KIRANMAI' },
    { enrollmentNumber: '23114033', fullName: 'GUDDANTI VENKATA SREE CHARAN' },
    { enrollmentNumber: '23114034', fullName: 'HARSH GOYAL' },
    { enrollmentNumber: '23114035', fullName: 'HARSHIT JADWANI' },
    { enrollmentNumber: '23114036', fullName: 'HARSHIT KUMAR' },
    { enrollmentNumber: '23114037', fullName: 'HARSHIT KUMAR MEENA' },
    { enrollmentNumber: '23114038', fullName: 'HEMANI KONKATI' },
    { enrollmentNumber: '23114039', fullName: 'JAI BHADU' },
    { enrollmentNumber: '23114040', fullName: 'JALIGAMA RAVITEJA' },
    { enrollmentNumber: '23114041', fullName: 'JATOTH BINDU' },
    { enrollmentNumber: '23114042', fullName: 'JEEVAN SOORIYA V' },
    { enrollmentNumber: '23114043', fullName: 'KAJAL' },
    { enrollmentNumber: '23114044', fullName: 'KANDAGATLA VENKATA SAI VIVEK' },
    { enrollmentNumber: '23114045', fullName: 'KANDARP SINGH MAHOBIYA' },
    { enrollmentNumber: '23114046', fullName: 'KARTIK GOYAL' },
    { enrollmentNumber: '23114047', fullName: 'KARTIK SARDA' },
    { enrollmentNumber: '23114048', fullName: 'KESHAMOLLA MANISHA' },
    { enrollmentNumber: '23114049', fullName: 'KOTA SAI HARSHAVARDHAN' },
    { enrollmentNumber: '23114050', fullName: 'KRISH SINGLA' },
    { enrollmentNumber: '23114051', fullName: 'KRITIK VIJAY' },
    { enrollmentNumber: '23114052', fullName: 'KUMUD' },
    { enrollmentNumber: '23114053', fullName: 'KURLEPU RAJESH' },
    { enrollmentNumber: '23114054', fullName: 'LAKHVEER SINGH' },
    { enrollmentNumber: '23114055', fullName: 'LAKSHYA KATARIA' },
    { enrollmentNumber: '23114056', fullName: 'LANKA RAKESH VENKATA SAI' },
    { enrollmentNumber: '23114057', fullName: 'LAVANYA SINGHAL' },
    { enrollmentNumber: '23114058', fullName: 'LOLUGU DOLASH VARDHAN' },
    { enrollmentNumber: '23114059', fullName: 'MADHAV DEORAH' },
    { enrollmentNumber: '23114060', fullName: 'MAMUNURI SAI SREEMANTH' },
    { enrollmentNumber: '23114061', fullName: 'AVIK MANDAL' },
    { enrollmentNumber: '23114062', fullName: 'MANTHAN SONI' },
    { enrollmentNumber: '23114063', fullName: 'MARUPAKA KOUSHIK' },
    { enrollmentNumber: '23114064', fullName: 'MATHI KARTHIK' },
    { enrollmentNumber: '23114065', fullName: 'MEGH BHAVESH SHAH' },
    { enrollmentNumber: '23114066', fullName: 'MELLIMI RAHUL' },
    { enrollmentNumber: '23114067', fullName: 'MUSKAN VARUN' },
    { enrollmentNumber: '23114068', fullName: 'MUTHALA BANUNADHA REDDY' },
    { enrollmentNumber: '23114069', fullName: 'NALLAPARAJU AASISH VARMA' },
    { enrollmentNumber: '23114070', fullName: 'NAMA SRI SHASHANK' },
    { enrollmentNumber: '23114071', fullName: 'NAVODIT VERMA' },
    { enrollmentNumber: '23114072', fullName: 'NEERASA VENKATA SANTHOSH' },
    { enrollmentNumber: '23114073', fullName: 'NISARG PRAJAPATI' },
    { enrollmentNumber: '23114074', fullName: 'NITIN AGIWAL' },
    { enrollmentNumber: '23114075', fullName: 'NITIN RAJ' },
    { enrollmentNumber: '23114076', fullName: 'PARTH BARANWAL' },
    { enrollmentNumber: '23114077', fullName: 'PISINI KOWSALYA DEVI' },
    { enrollmentNumber: '23114078', fullName: 'POLAMPALLI BALAJI' },
    { enrollmentNumber: '23114079', fullName: 'PONNATHOTA PRAMOD KUMAR REDDY' },
    { enrollmentNumber: '23114080', fullName: 'PORAM JAGANNADHAM NAIDU' },
    { enrollmentNumber: '23114081', fullName: 'PRADYUMN KEJRIWAL' },
    { enrollmentNumber: '23114082', fullName: 'PUNEET MERUGU' },
    { enrollmentNumber: '23114083', fullName: 'RANI MARAVI' },
    { enrollmentNumber: '23114084', fullName: 'RATHOD PRANJAL BABAN' },
    { enrollmentNumber: '23114085', fullName: 'REDDI NIKHIL KUMAR' },
    { enrollmentNumber: '23114086', fullName: 'REJETI NAVYA' },
    { enrollmentNumber: '23114087', fullName: 'RIDHAM DAVE' },
    { enrollmentNumber: '23114088', fullName: 'ROHAN GUPTA' },
    { enrollmentNumber: '23114089', fullName: 'SALONI PURUSHOTTAM NYATI' },
    { enrollmentNumber: '23114090', fullName: 'SARODE PRANEETH' },
    { enrollmentNumber: '23114091', fullName: 'SHIV SHAKTI KUMAR' },
    { enrollmentNumber: '23114092', fullName: 'SHUBHAM KATARIA' },
    { enrollmentNumber: '23114093', fullName: 'SIDDHARTH GUPTA' },
    { enrollmentNumber: '23114094', fullName: 'SUHANI JINDAL' },
    { enrollmentNumber: '23114095', fullName: 'SUHANI SINGH CHARAN' },
    { enrollmentNumber: '23114096', fullName: 'SUMIT CHADGAL' },
    { enrollmentNumber: '23114097', fullName: 'SUPRAJEET SUMAN' },
    { enrollmentNumber: '23114098', fullName: 'THUMKUNTA CHARAN KUMAR' },
    { enrollmentNumber: '23114099', fullName: 'THUMMALAPALLI VENKATA PAVAN KUMAR' },
    { enrollmentNumber: '23114100', fullName: 'TOGARU CHARITHA' },
    { enrollmentNumber: '23114101', fullName: 'UTKARSH KUMAR' },
    { enrollmentNumber: '23114102', fullName: 'UTKARSH RAJ' },
    { enrollmentNumber: '23114103', fullName: 'VADAPALLI BADRINATH' },
    { enrollmentNumber: '23114104', fullName: 'VAGHASIYA JAY RASIKBHAI' },
    { enrollmentNumber: '23114105', fullName: 'VAGHELA KAVY PIYUSHKUMAR' },
    { enrollmentNumber: '23114106', fullName: 'VANKUNAVATH VENKATESH' },
    { enrollmentNumber: '23114107', fullName: 'VISHESH GUPTA' },
    { enrollmentNumber: '23114108', fullName: 'VOODEM DEEKSHITH REDDY' },
    { enrollmentNumber: '23114109', fullName: 'VUNNAM AJAY' },
    { enrollmentNumber: '23114110', fullName: 'YENDLURI HANUMA NIHAR CHOWDARY' },
    // Other branch students
    { enrollmentNumber: '23115017', fullName: 'ANSH JAIN' },
    { enrollmentNumber: '23115024', fullName: 'ARYAN CHOUDHARY' },
    { enrollmentNumber: '23115107', fullName: 'PRADYUMAN SINGH SHEKHAWAT' },
    { enrollmentNumber: '23116089', fullName: 'SHYAM DINESH AGARWAL' },
    { enrollmentNumber: '23125032', fullName: 'SHORYA PANWAR' },
    { enrollmentNumber: '23125040', fullName: 'YASH JAIN' },
    { enrollmentNumber: '23323044', fullName: 'TANAY KAPADIA' },
    { enrollmentNumber: '23112014', fullName: 'ARYAN LAROIA' },
    { enrollmentNumber: '23112036', fullName: 'DIVYESH BANSAL' },
    { enrollmentNumber: '23112066', fullName: 'NANDINI' },
    { enrollmentNumber: '23113089', fullName: 'KRISHNA PAHARIYA' },
];

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for seeding CSE users');

        let added = 0;
        let skipped = 0;

        for (const student of cseStudents) {
            // Skip if enrollmentNumber key is misspelled
            if (!student.enrollmentNumber) continue;

            const exists = await User.findOne({ enrollmentNumber: student.enrollmentNumber });

            if (!exists) {
                await User.create({
                    enrollmentNumber: student.enrollmentNumber,
                    fullName: student.fullName,
                    branch: 'Computer Science and Engineering Department',
                    email: `${student.enrollmentNumber}@iitr.ac.in`,
                    displayPicture: null,
                });
                added++;
                console.log(`Added: ${student.enrollmentNumber} - ${student.fullName}`);
            } else {
                skipped++;
                console.log(`Skipped (exists): ${student.enrollmentNumber}`);
            }
        }

        console.log(`\n========================================`);
        console.log(`User seeding complete:`);
        console.log(`  - Added: ${added} new users`);
        console.log(`  - Skipped: ${skipped} (already exist)`);
        console.log(`  - Total in list: ${cseStudents.length}`);
        console.log(`========================================`);
        console.log(`\nNote: Profile pictures and accurate names will update when users login via Channel-i`);

        process.exit(0);
    } catch (error) {
        console.error('User seeding error:', error);
        process.exit(1);
    }
};

seedUsers();
