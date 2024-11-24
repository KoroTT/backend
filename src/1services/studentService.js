const {client} = require('../0config/database');

async function getAllStudents() {
    try {
        const query = 'select tp.id_person, tp.active, tpd.first_name,tpd.last_name,tpd.cpf,tpd.celular from "PeDeByteSchema".tb_person tp join "PeDeByteSchema".tb_person_data tpd on tp.id_person = tpd.tb_person_id_person join "PeDeByteSchema".tb_member tm on tp.id_person = tm.tb_person_id_person join "PeDeByteSchema".tb_student ts on tp.id_person = ts.tb_member_tb_person_id_person ;';
        const result = await client.query(query);

        console.log ('Resultado do SELECT: ', result.rows);
        return result.rows;
    } catch (err) {
        console.error(`Erro ao buscar todos os estudantes: ${err}`);
        throw err;
    }
}

async function getSpecialityFromStudent(id){
    try {
        const query = 'select ts.idtb_speciality, ts."name"  from "PeDeByteSchema".tb_speciality ts join "PeDeByteSchema".tb_necessity tn on ts.idtb_speciality = tn.tb_speciality_idtb_speciality where tn.tb_member_tb_person_id_person = $1;';
        const values = [id];
        const result = await client.query(query, values);

        console.log("Registro de escpecialidades dos alunos: ", result.rows);
        return result.rows;
    } catch (err) {
        console.error(`Erro ao buscar as especialidades do aluno ${id}: ${err}`);
        throw err;
    }
}

async function createStudent(status, idSchool, firstName, lastName, cpf, celular, obs, idAvalilablehours, especialits) {
    try {
        // Inicia a transação
        await client.query('BEGIN');

        // Primeiro comando: inserir na tabela tb_person
        const personQuery = `
            INSERT INTO "PeDeByteSchema".tb_person (active, tb_school_id_school) 
            VALUES ($1, $2) 
            RETURNING id_person;
        `;
        const personResult = await client.query(personQuery, [status, idSchool]);
        const personId = personResult.rows[0].id_person;

        // Segundo comando: inserir na tabela tb_person_data
        const personDataQuery = `
            INSERT INTO "PeDeByteSchema".tb_person_data 
            (tb_person_id_person, first_name, last_name, cpf, celular) 
            VALUES ($1, $2, $3, $4, $5);
        `;
        await client.query(personDataQuery, [personId, firstName, lastName, cpf, celular]);

        const memberQuery = `insert into "PeDeByteSchema".tb_member (tb_person_id_person, obs) values ($1, $2);`
        await client.query(memberQuery, [personId, obs]);

        const studentQuery = `insert into "PeDeByteSchema".tb_student (tb_member_tb_person_id_person) values ($1);`
        await client.query(studentQuery, [personId]);

        for (const hour of idAvalilablehours){
            const availableHoursQuery = `insert into "PeDeByteSchema".tb_available_time (Member_tb_person_id_person, tb_hours_id_hours) values ($1, $2);`

            await client.query(availableHoursQuery, [personId, hour]);
        }

        for (const )

        // Finaliza a transação
        await client.query('COMMIT');

        console.log('Novo aluno inserido: ', personResult.rows[0]);
        return personResult.rows[0];
    } catch (err) {
        // Reverte a transação em caso de erro
        await client.query('ROLLBACK');
        console.error('Erro ao criar o aluno: ', err);
        throw err;
    }
}