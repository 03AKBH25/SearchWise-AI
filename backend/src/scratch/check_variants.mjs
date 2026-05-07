import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const Fund = mongoose.model('Fund', new mongoose.Schema({
  schemeCode: String, schemeName: String, nav: Number, date: String, variant: String, normalized: String
}));

const total   = await Fund.countDocuments();
const direct  = await Fund.countDocuments({ variant: 'direct' });
const regular = await Fund.countDocuments({ variant: 'regular' });
const neither = await Fund.countDocuments({ variant: { $exists: false } });

// How many unique base names have BOTH variants?
const directNames  = await Fund.distinct('normalized', { variant: 'direct' });
const regularNames = await Fund.distinct('normalized', { variant: 'regular' });
const directSet    = new Set(directNames);
const bothVariants = regularNames.filter(n => directSet.has(n)).length;

const sampleDirect  = await Fund.find({ variant: 'direct'  }).limit(2).lean();
const sampleRegular = await Fund.find({ variant: 'regular' }).limit(2).lean();

console.log('\n=== Fund Variant Breakdown ===');
console.log(`Total records : ${total}`);
console.log(`Direct        : ${direct}`);
console.log(`Regular       : ${regular}`);
console.log(`No variant tag: ${neither}`);
console.log(`Funds with BOTH variants: ~${bothVariants}`);
console.log('\nSample Direct:',  sampleDirect.map(f => f.schemeName));
console.log('Sample Regular:', sampleRegular.map(f => f.schemeName));

await mongoose.disconnect();
