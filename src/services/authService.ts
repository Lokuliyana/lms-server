import { OTP } from '../models/OTP';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Role } from '../models/Role';
import mongoose from 'mongoose';
import crypto from 'crypto';

export const authService = {
  // Step 1: Send OTP and cache user info
  async registerStep1(data: { email: string; phone: string; full_name: string; password_hash: string }) {
    // Generate cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // Cache info in OTP collection
    await OTP.create({
      email: data.email,
      phone: data.phone,
      full_name: data.full_name,
      password_hash: data.password_hash,
      otp: otpCode
    });

    // Send OTP via SMS/Email (mocked for now)
    console.log(`Sending OTP ${otpCode} to ${data.email}`);
    return { message: 'OTP sent successfully' };
  },

  // Step 2: Verify OTP and create user
  async registerStep2(email: string, otp: string) {
    let session: mongoose.ClientSession | null = null;
    let inTx = false;

    try {
      const topologyType = (mongoose.connection as any)?.client?.topology?.description?.type;
      const isReplicaOrSharded = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

      if (isReplicaOrSharded) {
        try {
          session = await mongoose.startSession();
          session.startTransaction();
          inTx = true;
        } catch {
          inTx = false;
        }
      }

      const cached = inTx && session
        ? await OTP.findOne({ email, otp }).session(session)
        : await OTP.findOne({ email, otp });

      if (!cached) {
        throw new Error('Invalid or expired OTP');
      }

      // Check if user already exists
      const existingUser = inTx && session
        ? await User.findOne({ 
            $or: [{ email: cached.email }, { phone: cached.phone }] 
          }).session(session)
        : await User.findOne({ 
            $or: [{ email: cached.email }, { phone: cached.phone }] 
          });
      
      if (existingUser) {
        throw new Error('Email or phone already in use');
      }

      // Parse full_name into required first_name and last_name to prevent Mongoose ValidationError
      const nameParts = (cached.full_name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Student';
      const lastName = nameParts.slice(1).join(' ') || '.';

      // Resolve student role
      const studentRole = inTx && session
        ? await Role.findOne({ name: { $regex: /^student$/i } }).session(session)
        : await Role.findOne({ name: { $regex: /^student$/i } });
      const roleIds = studentRole ? [studentRole._id] : [];

      // Create user
      const user = new User({
        first_name: firstName,
        last_name: lastName,
        email: cached.email.toLowerCase().trim(),
        phone: cached.phone.trim(),
        password_hash: cached.password_hash,
        is_verified: true, // Fix 1.3: Set is_verified = true inside transaction
        role_ids: roleIds
      });

      if (inTx && session) {
        await user.save({ session });
      } else {
        await user.save();
      }

      // Create StudentProfile by default
      const profile = new StudentProfile({
        user_id: user._id,
        full_name: cached.full_name,
      });

      if (inTx && session) {
        await profile.save({ session });
        // Cleanup OTP
        await OTP.deleteOne({ _id: cached._id }).session(session);
        await session.commitTransaction();
      } else {
        await profile.save();
        await OTP.deleteOne({ _id: cached._id });
      }

      return user;
    } catch (error) {
      if (inTx && session && session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  },

  // Fix 1.7: Inefficient data fetching -> Mongoose Aggregation Pipeline with Bounded Pagination & Search
  async getAllUsers(options: { page?: number; limit?: number; search?: string; role?: string } = {}) {
    const rawPage = Math.floor(Number(options.page));
    const page = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
    const rawLimit = Math.floor(Number(options.limit));
    const limit = isNaN(rawLimit) || rawLimit <= 0 ? 10 : Math.min(100, rawLimit);
    const skip = Math.floor((page - 1) * limit);

    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: 'studentprofiles',
          localField: '_id',
          foreignField: 'user_id',
          as: 'profile'
        }
      },
      {
        $unwind: { path: '$profile', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'role_ids',
          foreignField: '_id',
          as: 'roles'
        }
      },
      {
        $addFields: {
          full_name: {
            $ifNull: [
              '$profile.full_name',
              {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ['$first_name', ''] },
                      ' ',
                      { $ifNull: ['$last_name', ''] }
                    ]
                  }
                }
              }
            ]
          },
          avatar_url: '$profile.avatar_url',
          school: '$profile.school',
          grade: '$profile.grade',
          roles_list: {
            $map: {
              input: '$roles',
              as: 'r',
              in: { $toLower: '$$r.name' }
            }
          },
          role: {
            $toLower: {
              $ifNull: [
                { $arrayElemAt: ['$roles.name', 0] },
                'student'
              ]
            }
          }
        }
      }
    ];

    const matchConditions: any = {};

    if (options.role && options.role.trim() && options.role.trim().toLowerCase() !== 'all') {
      const targetRole = options.role.trim().toLowerCase();
      matchConditions.$or = [
        { role: targetRole },
        { roles_list: targetRole }
      ];
    }

    if (options.search && options.search.trim()) {
      const safeSearch = options.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchMatch = [
        { full_name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } }
      ];
      if (matchConditions.$or) {
        matchConditions.$and = [
          { $or: matchConditions.$or },
          { $or: searchMatch }
        ];
        delete matchConditions.$or;
      } else {
        matchConditions.$or = searchMatch;
      }
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Stable sort: newest first, tie-break by _id
    pipeline.push({
      $sort: { createdAt: -1, _id: -1 }
    });

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              password_hash: 0,
              profile: 0,
              roles: 0,
              roles_list: 0
            }
          }
        ]
      }
    });

    const [result] = await User.aggregate(pipeline);
    const total = result?.metadata?.[0]?.total || 0;
    const users = result?.data || [];
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      users,
      total,
      page,
      limit,
      totalPages
    };
  }
};
