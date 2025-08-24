const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generar JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Ruta temporal de registro para crear usuario de prueba
router.post('/register', [
  body('firstName', 'Nombre es requerido').notEmpty().trim(),
  body('lastName', 'Apellido es requerido').notEmpty().trim(),
  body('email', 'Email válido es requerido').isEmail().normalizeEmail(),
  body('password', 'Password debe tener al menos 6 caracteres').isLength({ min: 6 }),
  body('companyName', 'Nombre de empresa es requerido').notEmpty().trim(),
  body('branchName', 'Nombre de sucursal es requerido').notEmpty().trim(),
  body('companyRfc', 'RFC de empresa es requerido').notEmpty().trim(),
  body('companyAddress', 'Dirección de empresa').optional().trim(),
  body('companyPhone', 'Teléfono de empresa').optional().trim(),
  body('companyEmail', 'Email de empresa').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, companyName, branchName, companyRfc, companyAddress, companyPhone, companyEmail } = req.body;

    console.log('Datos recibidos:', req.body);
    console.log('RFC recibido:', companyRfc);

    // Verificar si el usuario ya existe
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'Usuario ya existe' });
    }

    // Crear empresa
    const company = new Company({
      name: companyName,
      rfc: companyRfc,
      address: {
        street: companyAddress || 'Calle Principal 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España'
      },
      contact: {
        phone: companyPhone || '',
        email: companyEmail || email,
        website: ''
      },
      subscription: {
        plan: 'basic',
        maxVehicles: 10,
        maxUsers: 5,
        maxBranches: 5
      },
      isActive: true
    });
    await company.save();

    // Crear sucursal
    const branch = new Branch({
      name: branchName,
      company: company._id,
      address: '',
      phone: '',
      isActive: true
    });
    await branch.save();

    // Crear usuario
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'super_admin',
      company: company._id,
      branches: [branch._id],
      isActive: true
    });

    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        company: company,
        branches: [branch]
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   POST /api/auth/login
// @desc    Autenticar usuario
// @access  Public
router.post('/login', [
  body('email', 'Email válido es requerido').isEmail().normalizeEmail(),
  body('password', 'Password es requerido').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email })
      .populate('company', 'name rfc isActive')
      .populate('branches', 'name code');

    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Verificar si la cuenta está bloqueada
    if (user.isLocked) {
      return res.status(423).json({ 
        message: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos' 
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }

    // Verificar si la empresa está activa (solo para usuarios que no son super_admin)
    if (user.role !== 'super_admin' && (!user.company || !user.company.isActive)) {
      return res.status(401).json({ message: 'Empresa inactiva' });
    }

    // Verificar password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Reset intentos de login y actualizar último login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Generar token
    const token = generateToken(user._id);

    res.json({
      message: 'Login exitoso',
      token,
      user
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/auth/me
// @desc    Obtener usuario actual
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company', 'name rfc subscription')
      .populate('branches', 'name code address');

    res.json({ user });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   GET /api/auth/profile
// @desc    Obtener perfil de usuario
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company', 'name rfc subscription')
      .populate('branches', 'name code address');

    res.json({ user });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Actualizar perfil de usuario
// @access  Private
router.put('/profile', [
  auth,
  body('firstName', 'Nombre es requerido').optional().notEmpty().trim(),
  body('lastName', 'Apellido es requerido').optional().notEmpty().trim(),
  body('phone', 'Teléfono inválido').optional().isMobilePhone('es-ES')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { firstName, lastName, phone, preferences } = req.body;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).populate('company', 'name rfc')
     .populate('branches', 'name code');

    res.json({
      message: 'Perfil actualizado exitosamente',
      user
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Cambiar contraseña
// @access  Private
router.put('/change-password', [
  auth,
  body('currentPassword', 'Contraseña actual es requerida').exists(),
  body('newPassword', 'Nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verificar contraseña actual
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Solicitar reset de contraseña
// @access  Public
router.post('/forgot-password', [
  body('email', 'Email válido es requerido').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Email inválido', 
        errors: errors.array() 
      });
    }

    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      // Por seguridad, no revelar si el email existe
      return res.json({ 
        message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña' 
      });
    }

    // Generar token de reset
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hora
    await user.save();

    // Aquí enviarías el email con el token
    // Por ahora solo devolvemos el token para testing
    console.log(`Reset token para ${email}: ${resetToken}`);

    res.json({ 
      message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña',
      // En producción, no incluir el token en la respuesta
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });

  } catch (error) {
    console.error('Error en forgot password:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Resetear contraseña con token
// @access  Public
router.post('/reset-password', [
  body('token', 'Token es requerido').exists(),
  body('newPassword', 'Nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: errors.array() 
      });
    }

    const { token, newPassword } = req.body;

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Token inválido' });
    }

    const user = await User.findOne({
      _id: decoded.id,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    // Actualizar contraseña
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error en reset password:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Renovar token de acceso
// @access  Private
router.post('/refresh-token', auth, async (req, res) => {
  try {
    const newToken = generateToken(req.user._id);
    
    res.json({
      message: 'Token renovado exitosamente',
      token: newToken
    });

  } catch (error) {
    console.error('Error renovando token:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/logout
// @desc    Cerrar sesión (invalidar token)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // En una implementación más robusta, podrías mantener una lista negra de tokens
    // Por ahora, simplemente confirmamos el logout
    
    res.json({ message: 'Sesión cerrada exitosamente' });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;