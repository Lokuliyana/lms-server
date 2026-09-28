const fs = require('fs');
let code = fs.readFileSync('src/controllers/authController.ts', 'utf8');
code = code.replace(
  `      res.status(200).json({ success: true, data: userObj });
    } catch (err) {
      next(err);
    }
  },
  async getUserById(req: Request, res: Response, next: NextFunction) {`,
  `      res.status(200).json({ success: true, data: userObj });
    } catch (err) {
      next(err);
    }
  }, // this was missing the closing brace of getProfile

  async getUserById(req: Request, res: Response, next: NextFunction) {`
);
fs.writeFileSync('src/controllers/authController.ts', code);
