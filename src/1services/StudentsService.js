const {client} = require('../0config/database');
const { insertAvailableHours, inativateAvailableHours, getscheduledHour, deleteAvailableHours } = require('./availableHoursServise');
const { createMember, updateMember } = require('./memberService');
const { insertNecessity, deleteNecessityByID } = require('./necessityService');
const { createPersonDataStudent, updatePersonDataStudent } = require('./personDataService');
const { createPerson, inativatePerson, updatePerson } = require('./personService');
const { insertStudent } = require('./studentService');

async function getAllStudents() {
    try {
        const query = 'select tp.id_person, tp.active, tpd.first_name,tpd.last_name,tpd.cpf,tpd.celular, tpd.celular_2, tpd.responsavel, tm.obs from "PeDeByteSchema".tb_person tp join "PeDeByteSchema".tb_person_data tpd on tp.id_person = tpd.person_id join "PeDeByteSchema".tb_member tm on tp.id_person = tm.person_id join "PeDeByteSchema".tb_student ts on tp.id_person = ts.member_id where tp.active = true;';
        const result = await client.query(query);

        console.log ('Resultado do SELECT: ', result.rows);
        return result.rows;
    } catch (err) {
        console.error(`Erro ao buscar todos os estudantes: ${err}`);
        throw err;
    }
}

async function getStudentById(PersonId) {
    try {
        console.log(`ID de teste: ${PersonId}`)
        const query = `select  tp.id_person, 
		tp.active, 
		tpd.first_name,
		tpd.last_name,
		tpd.cpf,tpd.celular, 
		tpd.celular_2, 
		tpd.responsavel,
        tm.obs 
    from "PeDeByteSchema".tb_person tp 
    join "PeDeByteSchema".tb_person_data tpd on 
	    tp.id_person = tpd.person_id 
    join "PeDeByteSchema".tb_member tm on 
	    tp.id_person = tm.person_id 
    join "PeDeByteSchema".tb_student ts on 
	    tm.person_id  = ts.member_id 
    where 
        tp.active = true and 
        tp.id_person = $1;`;
        const result = await client.query(query, [PersonId]);

        console.log ('Resultado do SELECT: ', result.rows);
        return result.rows[0];
    } catch (err) {
        console.error(`Erro ao buscar todos os estudantes: ${err}`);
        throw err;
    }
}

async function getStudentsByName(PersonName) {
    try {
        const first = PersonName;
        const last = PersonName;
        console.log(`Nome recebido: ${PersonName}`);
        const query = `select  tp.id_person, 
		tp.active, 
		tpd.first_name,
		tpd.last_name,
		tpd.cpf,tpd.celular, 
		tpd.celular_2, 
		tpd.responsavel,
        tm.obs 
    from "PeDeByteSchema".tb_person tp 
    join "PeDeByteSchema".tb_person_data tpd on 
	    tp.id_person = tpd.person_id 
    join "PeDeByteSchema".tb_member tm on 
	    tp.id_person = tm.person_id 
    join "PeDeByteSchema".tb_student ts on 
	    tm.person_id  = ts.member_id 
    where 
        tp.active = true and 
        (lower(tpd.first_name) LIKE $1 OR lower(tpd.last_name) LIKE $2);`;
        const result = await client.query(query, [`%${PersonName}%`, `%${PersonName}%`]);
        console.log ('Resultado do SELECT: ', result.rows);
        return result.rows;
    } catch (err) {
        console.error(`Erro ao buscar todos os estudantes: ${err}`);
        throw err;
    }
}


async function createStudent(idSchool, firstName, lastName, cpf, celular, celular2, responsavel, obs, idAvalilablehours, specialits) {
    try {
        // Inicia a transação
        await client.query('BEGIN');

        console.log(responsavel)
        const personId = await createPerson(idSchool);
        await createPersonDataStudent (personId, firstName, lastName, cpf, celular, celular2, responsavel);
        await createMember (personId, obs)

        await insertStudent(personId);

        for (const hour of idAvalilablehours || []){
            await insertAvailableHours (personId, hour);
        }

        for (const necessity of specialits || []){
            await insertNecessity(personId, necessity);
        }

        // Finaliza a transação
        await client.query('COMMIT');

        console.log('Novo aluno inserido com ID: ', personId);
        return { id: personId };
    } catch (err) {
        // Reverte a transação em caso de erro
        await client.query('ROLLBACK');
        console.error('Erro ao criar o aluno: ', err);
        throw err;
    }
}

async function updateStudent(PersonId, idSchool, firstName, lastName, cpf, celular, celular2, responsavel, obs, idAvalilablehours, specialits){
    try {
        await client.query("BEGIN");

        updatePerson(PersonId, idSchool);
        updatePersonDataStudent(PersonId, firstName, lastName, cpf, celular, celular2, responsavel);

        for (const hour of idAvalilablehours){
            if (hour !== getscheduledHour(PersonId, hour)){
                deleteAvailableHours(PersonId, hour);
            }else{
                throw new Error(`Hora ${hour} já está agendada para o ID ${PersonId}. Operação interrompida.`);
            }
        }

        for (const hour of idAvalilablehours){
            insertAvailableHours(PersonId, hour);
        }

        deleteNecessityByID(PersonId);

        for (const necessity of specialits){
            insertNecessity(PersonId, necessity);
        }

        updateMember(PersonId, obs);

        await client.query("COMMIT");
        return { id: PersonId };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar o aluno: ', err);
        throw err;
    }
}

async function inativateStudent(PersonId) {
    
    try {
        await client.query('BEGIN');    

        const result = inativatePerson(PersonId);
        inativateAvailableHours(PersonId);

        await client.query('COMMIT');
        console.log(`Estudante com ID ${PersonId} inativado com sucesso.`); 
        return result;   
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao inativar estudante:', err);
        throw err;
    }
}
module.exports = {
    getStudentById,
    getAllStudents,
    createStudent,
    inativateStudent,
    updateStudent,
    getStudentsByName,
}