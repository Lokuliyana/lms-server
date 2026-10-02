import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { Subject } from '../models/Subject';
import { Grade } from '../models/Grade';
import { SiteSettings } from '../models/SiteSettings';
import { Class } from '../models/Class';
import { Quiz } from '../models/Quiz';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const migrate = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Initialize SiteSettings
    const settingsCount = await SiteSettings.countDocuments();
    if (settingsCount === 0) {
      console.log('Initializing SiteSettings...');
      // Load content-v2.json from frontend
      const contentPath = path.join(__dirname, '../../../lms-client/src/lib/content-v2.json');
      if (fs.existsSync(contentPath)) {
        const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
        await SiteSettings.create({
          site: content.site,
          pages: content.pages,
        });
        console.log('SiteSettings initialized successfully');
      } else {
        console.log('content-v2.json not found, skipping SiteSettings init');
      }
    } else {
      console.log('SiteSettings already exists, skipping init');
    }

    // 2. Extract and create Subjects and Grades
    console.log('Processing Subjects and Grades...');
    
    // We must fetch raw documents because the schema changed to ObjectId, but DB has string
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const classes = await db.collection('classes').find({}).toArray();
    const quizzes = await db.collection('quizzes').find({}).toArray();

    const uniqueSubjects = new Set<string>();
    const uniqueGrades = new Set<string>();

    for (const c of classes) {
      if (typeof c.subject === 'string' && c.subject.trim() !== '') {
        uniqueSubjects.add(c.subject.trim());
      }
      if (typeof c.grade === 'string' && c.grade.trim() !== '') {
        uniqueGrades.add(c.grade.trim());
      }
    }

    for (const q of quizzes) {
      if (typeof q.subject === 'string' && q.subject.trim() !== '') {
        uniqueSubjects.add(q.subject.trim());
      }
    }

    const subjectMap = new Map<string, mongoose.Types.ObjectId>();
    const gradeMap = new Map<string, mongoose.Types.ObjectId>();

    for (const subjectName of uniqueSubjects) {
      let subject = await Subject.findOne({ name: subjectName });
      if (!subject) {
        subject = await Subject.create({ name: subjectName });
        console.log(`Created Subject: ${subjectName}`);
      }
      subjectMap.set(subjectName, subject._id as mongoose.Types.ObjectId);
    }

    for (const gradeName of uniqueGrades) {
      let grade = await Grade.findOne({ name: gradeName });
      if (!grade) {
        grade = await Grade.create({ name: gradeName });
        console.log(`Created Grade: ${gradeName}`);
      }
      gradeMap.set(gradeName, grade._id as mongoose.Types.ObjectId);
    }

    // 3. Migrate Class and Quiz records
    console.log('Migrating Classes...');
    let classUpdateCount = 0;
    for (const c of classes) {
      let needsUpdate = false;
      const updateData: any = {};
      
      if (typeof c.subject === 'string' && subjectMap.has(c.subject.trim())) {
        updateData.subject = subjectMap.get(c.subject.trim());
        needsUpdate = true;
      }
      
      if (typeof c.grade === 'string' && gradeMap.has(c.grade.trim())) {
        updateData.grade = gradeMap.get(c.grade.trim());
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await db.collection('classes').updateOne({ _id: c._id }, { $set: updateData });
        classUpdateCount++;
      }
    }
    console.log(`Updated ${classUpdateCount} classes.`);

    console.log('Migrating Quizzes...');
    let quizUpdateCount = 0;
    for (const q of quizzes) {
      if (typeof q.subject === 'string' && subjectMap.has(q.subject.trim())) {
        await db.collection('quizzes').updateOne(
          { _id: q._id },
          { $set: { subject: subjectMap.get(q.subject.trim()) } }
        );
        quizUpdateCount++;
      }
    }
    console.log(`Updated ${quizUpdateCount} quizzes.`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

migrate();
