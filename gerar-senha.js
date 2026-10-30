const bcrypt = require('bcrypt'); // ou 'bcryptjs' se for o que você usa

const senhaOriginal = '123456';
const saltRounds = 10;

bcrypt.hash(senhaOriginal, saltRounds, (err, hash) => {
    if (err) {
        console.error("Erro ao gerar hash:", err);
        return;
    }
    console.log("Copie o Hash abaixo e cole no banco de dados para o usuário 'colaborador':");
    console.log(hash);
});