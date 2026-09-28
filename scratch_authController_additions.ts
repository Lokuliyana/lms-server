  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id).lean();
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      const Role = mongoose.model('Role');
      const roles = await Role.find({ _id: { $in: user.role_ids } });
      const roleNames = roles.map(r => r.name.toLowerCase());
      
      let role = 'student';
      if (roleNames.includes('admin')) role = 'admin';
      else if (roleNames.includes('teacher')) role = 'teacher';
      else if (roleNames.includes('moderator')) role = 'moderator';

      // Fetch profile
      let profile = {};
      if (role === 'student') {
        const StudentProfile = mongoose.model('StudentProfile');
        profile = await StudentProfile.findOne({ user_id: user._id }).lean() || {};
      }

      res.status(200).json({ success: true, data: { ...user, ...profile, role } });
    } catch (err) {
      next(err);
    }
  },

  async adminResetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { newPassword } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      user.password_hash = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
      
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (!(await bcrypt.compare(oldPassword, user.password_hash))) {
        return res.status(400).json({ success: false, message: 'Invalid current password' });
      }

      user.password_hash = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.status(200).json({ success: true, message: 'Password changed successful' });
    } catch (err) {
      next(err);
    }
  },

  async editUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Implement profile update logic
      const { full_name, phone, school, grade, birth_date, ol_year, al_year, bio, qualifications } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      if (phone) {
        user.phone = phone;
        await user.save();
      }

      const Role = mongoose.model('Role');
      const roles = await Role.find({ _id: { $in: user.role_ids } });
      const isStudent = roles.some(r => r.name.toLowerCase() === 'student');

      if (isStudent) {
        const StudentProfile = mongoose.model('StudentProfile');
        await StudentProfile.findOneAndUpdate(
          { user_id: user._id },
          { full_name, school, grade, birth_date, ol_year, al_year },
          { upsert: true }
        );
      }

      res.status(200).json({ success: true, message: 'Profile updated' });
    } catch (err) {
      next(err);
    }
  },
