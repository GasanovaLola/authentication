const User = require('./models/users');

class postServise {
    async addFriend(req, res) {
        try {
            const {friendRequests: idUserRequest, friendTarget: idUserTarget} = req.body;

            if(!idUserRequest || !idUserTarget) throw new Error("Wrong params!");
            const user = await User.findById(idUserRequest);

            if(!user) throw new Error("User does not exist!");
            await user.pendingFriends.push(idUserRequest);

            res.status(200).json({ success: true });
            await user.save();
        }
        catch (err) {
            console.log(err);
            res.status(404).send(err.message);
        }
    }

    async getFriends(req, res) {
        try {
            const {friendRequests: idUserRequest, flag: requestFlag, pendingFriends} = req.body;

            if(!idUserRequest) throw new Error("Wrong params");

            const user = await User.findById(idUserRequest);
            let friends = await User.find({_id: { $in: user.friends } });

            if(!requestFlag || friends.length > 0) throw new Error("Пользователь отклонил ваш запрос в друзья!");

            friends = friends.map(obj => obj.name);

            user.friends = pendingFriends;
            user.pendingFriends = user.pendingFriends.pop();

            const newUser = await User.findById(friends[0]);

            newUser.friends = idUserRequest;
            newUser.pendingFriends = req.body.pendingFriends.pop();
            
            await user.save();
            await newUser.save();

            res.status(200).json(newUser);
        }
        catch (err) {
        console.log(err);
        res.status(400).send(err.message);
        }
    }

    async getAllUsers(req, res){
        try {
            const users = await User.find();

            res.status(200).json(users);
        }
        catch (err) {
            console.log(err);
            res.status(404).send(err.message);
        }
    }

    async getUser(req, res){
        try {
            const id = req.params.userId;

            const user = await User.findById(id);

            res.status(200).json(user);
        }
        catch (err) {
            console.log(err);
            res.status(400).send(err.message);
        }
    }

    async createUser(req, res){
        try {
            const {balance, picture, age, name, gender, company, email, friends, pendingFriends} = req.body;
            const newUser = new User(balance, picture, age, name, gender, company, email, friends, pendingFriends);
            await newUser.save();

            res.status(404).json(newUser);
        }
        catch (err) {
            console.log(err);
            res.send(404).send(err.message);
        }
    }

    async updateUser(req, res) {
        try{
            const id = req.params.userId;
            const {balance, picture, age, name, gender, company, email, friends, pendingFriends} = req.body;
            
            const updatedUser = await User.findById(id);

            Object.assign(user, {balance, picture, age, name, gender, company, email, friends, pendingFriends});
            await updatedUser.save();

            res.status(200).json(updatedUser);
        }
        catch (err) {
            console.log(err);
            res.status(404).send(err.message);
        }
    }

    async deleteUser(req, res) {
        try {
            const id = req.params.userId;

            const user = await User.findById(id);
            const deletedUser = await user.remove();

            res.status(200).json(deletedUser);
        }
        catch (err) {
            console.log(err);
            res.status(400).send(err.message);
        }
    }
}

module.exports = new postServise();