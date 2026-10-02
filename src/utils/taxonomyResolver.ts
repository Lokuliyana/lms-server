import mongoose from 'mongoose';
import { Subject } from '../models/Subject';
import { Grade } from '../models/Grade';

export async function resolveSubject(subjectInput: any): Promise<mongoose.Types.ObjectId | undefined> {
  if (!subjectInput) return undefined;

  let val = subjectInput;
  if (typeof val === 'object' && val !== null) {
    if (val._id) val = val._id;
    else if (val.name) val = val.name;
    else if (val.title) val = val.title;
  }

  if (mongoose.Types.ObjectId.isValid(val)) {
    return new mongoose.Types.ObjectId(val);
  }

  const clean = String(val).trim();
  if (!clean || clean.toLowerCase() === 'none' || clean.toLowerCase() === 'all' || clean.toLowerCase() === 'undefined') {
    return undefined;
  }

  let found = await Subject.findOne({ name: new RegExp(`^${clean}$`, 'i') });
  if (!found) {
    found = await Subject.findOne({ name: new RegExp(clean, 'i') });
  }
  if (!found) {
    found = await Subject.create({ name: clean, is_active: true });
  }
  return found._id as mongoose.Types.ObjectId;
}

export async function resolveGrade(gradeInput: any): Promise<mongoose.Types.ObjectId | undefined> {
  if (!gradeInput) return undefined;

  let val = gradeInput;
  if (typeof val === 'object' && val !== null) {
    if (val._id) val = val._id;
    else if (val.name) val = val.name;
    else if (val.title) val = val.title;
  }

  if (mongoose.Types.ObjectId.isValid(val)) {
    return new mongoose.Types.ObjectId(val);
  }

  const clean = String(val).replace(/^grade\s*/i, '').trim();
  if (!clean || clean.toLowerCase() === 'none' || clean.toLowerCase() === 'all' || clean.toLowerCase() === 'undefined') {
    return undefined;
  }

  let found = await Grade.findOne({
    $or: [
      { name: new RegExp(`^${clean}$`, 'i') },
      { name: new RegExp(`^Grade\\s*${clean}$`, 'i') },
    ],
  });
  if (!found) {
    const displayName = clean.toLowerCase().startsWith('grade') ? clean : `Grade ${clean}`;
    found = await Grade.create({ name: displayName, is_active: true });
  }
  return found._id as mongoose.Types.ObjectId;
}
