const Router = require('express');
const router = new Router();
const { check } = require('express-validator');
const controller = require('./controller');
const postServise = require('./postServise');
const authMiddleWare = require('./middleWare/authMiddleWare');
const roleMiddleWare = require('./middleWare/roleMiddleWare');

router.get('/', postServise.getAllUsers);
router.post('/addFriend', postServise.addFriend);
router.post('/getFriends', postServise.getFriends);
router.get('/user/:userId', postServise.getUser);
router.post('/', postServise.createUser);
router.put('/:userId', postServise.updateUser);
router.delete('/:userId', postServise.deleteUser);

router.post('/registration', [
  check('username', "Имя пользователя не может быть пустым").notEmpty(),
  check('password', "Пароль должен быть не мешьше 5 и не больше 10 символов").isLength({min: 5, max: 10})
], controller.registration);
router.post('/login', controller.login);
router.get('/getUser', authMiddleWare, controller.getUsers);
//router.get('/getUser', roleMiddleWare(['USER']), getUsers);

module.exports = router;