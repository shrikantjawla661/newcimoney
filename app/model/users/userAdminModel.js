let userAdminModel = {};
const { pool } = require("../../utils/configs/database");
const bcrypt = require("bcrypt");
const commonModel = require("../../model/commonModel");

// This function will return userAdminColumn to send to commonview ejs file to render on frontend

userAdminModel.getUaColumns = async () => {
  let returnData = {
    allTr: [],
  };
  let queryForTr = `SELECT 
        CONCAT('edit-user-admin-ui?id=',user_admin.ua_id) as "Edit",
        user_admin.ua_id as select,
        user_admin.ua_id as "int|ua_id|Id",
        user_admin.ua_name as "string|ua_name|Name",
        user_admin.ua_email as "string|ua_email|Email",
        user_admin.ua_role as "multiple|ua_role|Role",
        user_admin.active_user as "bool|active_user|Active Status",
        CAST(user_admin.created_at as varchar) as "date|created_at|Created at",
        CAST(user_admin.updated_at as varchar) as "date|updated_at|Updated at"
            FROM user_admin
            LEFT JOIN user_admin_role AS uar ON uar.uar_id=user_admin.ua_role
            limit 1`;
  let allTr = await commonModel.getDataOrCount(queryForTr, [], "D");
  let getAlRolesQuery =  `SELECT uar_id as value , uar_role_name as  ua_role  FROM public.user_admin_role
  ORDER BY uar_id ASC `;
  let selectOptions = {
    ua_role:  await  commonModel.getDataOrCount(getAlRolesQuery, [], 'D'),
  };
  //  console.log('ua_rolleee',selectOptions)

  returnData.allTr = allTr;
  returnData.selectOptions = selectOptions;
  return returnData;
};

userAdminModel.getFilteredUserAdmins = async function (body) {
  let { filterObject, pageNo, sort } = body;
  let { entriesPerPage } = filterObject;
  let returnData = {
    userAdminList: [],
  };

  entriesPerPage = entriesPerPage || 10;
  sort = sort || "ua_id";
  let offset = (pageNo - 1) * entriesPerPage;
  let ascDesc = "asc NULLS FIRST";
  if (sort.startsWith("-")) {
    sort = sort.substring(1);
    ascDesc = "desc NULLS LAST";
  }
  let query = `SELECT "ua_id","ua_name","ua_email","ua_role", "active_user",  uar."uar_role_name" 
    from user_admin 
    LEFT JOIN user_admin_role uar ON user_admin.ua_role=uar.uar_id
    ORDER By ${sort} ${ascDesc}
	limit ${entriesPerPage} offset ${offset};`;
  const countQuery = `SELECT count(*) from user_admin;`;
  try {
    let appData = await pool.query(query);
    let countData = await pool.query(countQuery);
    returnData = {
      count: countData.rows[0].count,
      userAdminList: appData.rows,
    };
  } catch (err) {
    console.error(err);
    returnData = { count: 0, userAdminList: [] };
  }
  return returnData;
};

userAdminModel.addNewAdminUser = async function (
  userPassword,
  userName,
  userEmail,
  userRole,
  userActive
) {
  let resultData = [];
  let returnData = false;

  let userPass = userPassword;

  const hashSalt = await bcrypt.genSalt(6);

  let clientPassword = await bcrypt.hash(userPass, hashSalt);
  let addUserData = {
    userName: userName,
    userEmail: userEmail,
    userPassword: clientPassword,
    userRole: userRole,
    userActive: userActive,
  };

  let checkUserIfexists = [];
  try {
    const checkUserResponse = await pool.query(
      `Select * from user_admin where ua_email = '${addUserData.userEmail}'`
    );
    checkUserIfexists = checkUserResponse.rows;
  } catch (error) {
    console.log(error);
  }

  const addAdminQuery = `INSERT INTO user_admin(ua_name, ua_email, ua_role, ua_password, active_user) values ('${addUserData.userName}', '${addUserData.userEmail}', ${addUserData.userRole},
    '${addUserData.userPassword}', ${addUserData.userActive}) returning *;`;

  if (checkUserIfexists.length == 0) {
    try {
      let response = await pool.query(addAdminQuery);
      resultData = response.rows;
      returnData = resultData;
    } catch (error) {
      console.log("Error _line:124", error);
    }
  }

  // console.log(addUserData, "adduser datat here....");
  // console.log("original pasword", userPass);
  // console.log("ivgiu  ....>>>>", clientPassword);
  // console.log(resultData, "result data from db ");
  // console.log(checkUserIfexists, "checkUser if already exists");
  return returnData;
};

//updating user admin



module.exports = userAdminModel;
