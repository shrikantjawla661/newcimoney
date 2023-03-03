let commonHelper = require("../../common/helper");
const commonModel = require("../../model/commonModel.js");
const bcrypt = require("bcrypt");
const uploadObject = require('../categories/uploadFileController')

let commonController = require("../../controller/commonController");
let accessMiddleware = require("../../common/checkAccessMiddleware");
const { pool } = require("../../utils/configs/database");
const categoriesModel = require("../../model/categories/categoriesModels");

const categoriesControllerObject = {};

categoriesControllerObject.categoriesListUI = async (req, res) => {
  let middleObj = await accessMiddleware.checkAccessPermition(req, 6, "W");
  if (middleObj) {
    let sideBarData = await commonController.commonSideBarData(req);
    let catColumns = await categoriesModel.getCatColumns();
    const displayName = "Categories List";
    res.render("commonView/commonView", {
      sidebarDataByServer: sideBarData,
      allTr: catColumns.allTr[0],
      displayName: displayName,
      addEntryUrl: `/categories/add-new-category`,
    });
  } else {
    res.render("error/noPermission");
  }
};

categoriesControllerObject.categoriesListAjax = async (req, res) => {
  let finalData = {
    status: false,
    code: "CIP-APPLICATION-ERR-101",
    message: "Something went wrong",
    payload: [],
  };
  let userdata = jwt.decode(req.session.userToken);
  let userLatestRole = await commonModel.getUserAdminRole(userdata.ua_id);
  let currentUserRole = userLatestRole[0].ua_role;
  let currentUserId = false;
  if (currentUserRole == 3) {
    currentUserId = userdata.ua_id;
  }
  let selectColumns = `
	CONCAT('edit-category-ui?id=',cim_categories.cat_id) as "Edit",
          cim_categories.cat_id as select,
          cim_categories.cat_id as "int|cat_id|Id",
          cim_categories.cat_name as "string|cat_name|Name",
          cim_categories.cat_desc as "string|cat_desc|Description",
          cim_categories.cat_img as "string|cat_img|Image",
          cim_categories.cat_sequence as "int|cat_sequence|Sequence",
          cim_categories.cat_status as "bool|cat_status|Status",
          cim_categories.cat_created_by as "int|cat_created_by|Created by",
          CAST(cim_categories.cat_created_at as varchar) as "date|cat_created_at|Created at",
          CAST(cim_categories.cat_updated_at as varchar) as "date|cat_updated_at|Updated at"
	`;
  let leftJoin = `LEFT JOIN user_admin AS ua ON ua.uar_id=user_admin.ua_role`;
  let tableName = "cim_categories";
  let dataFromDb = await commonModel.getDataByPagination({
    body: req.body,
    currenUserId: currentUserId,
    selectColumns: selectColumns,
    tableName: tableName,
    shortByColumn: "cat_id",
  });
  if (dataFromDb) {
    res.render("commonView/commonAjax", {
      applicationsList: dataFromDb.applicationsData,
      totalCount: dataFromDb.count,
      getAllIssuers: dataFromDb.getAllIssuers,
      currentIssuer: req.body.issuerName,
    });
  } else {
    commonHelper.errorHandler(res, finalData);
  }
};

categoriesControllerObject.addNewCategoryUI = async (req, res) => {
  let middleObj = await accessMiddleware.checkAccessPermition(req, 6, "W");
  if (middleObj) {
    let sideBarData = await commonController.commonSideBarData(req);
    res.render("categories/addNewCategory", {
      sidebarDataByServer: sideBarData,
    });
  } else {
    res.render("error/noPermission");
  }
};

categoriesControllerObject.addNewCategory = async (req, res) => {
  let { name, desc, sequence, status } = req.body;
  let response;
  try {
    if (req.file && name && desc && sequence && status) {
      //Here response recieved from s3 containing image location added into req object so that it can used in next middleware which will add data into DB.
      response = await uploadObject.uploadToS3(req.file.buffer).then((res) => {
        return res;
      });

      //   response_example = {
      //     ETag: '"d5747b9a352f0c4c4e277fd6a0861c99"',
      //     Location: 'https://ciwebback.sgp1.digitaloceanspaces.com/Partners/1677137146323.jpg',
      //     key: 'Partners/1677137146323.jpg',
      //     Key: 'Partners/1677137146323.jpg',
      //     Bucket: 'ciwebback'
      //   }

      const resp = await pool.query(
        categoriesModel.addNewCategoryQuery(
          name,
          desc,
          response.Location,
          sequence,
          status
        )
      );
      res.status(201).send({
        addedData: resp,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: error,
    });
  }
};


categoriesControllerObject.editExistingCategoryUI = async (req, res) => {
  let middleObj = await accessMiddleware.checkAccessPermition(req, 6, "W");
  if (middleObj) {
    let sideBarData = await commonController.commonSideBarData(req);
    res.render("categories/editExistingCategory", {
      sidebarDataByServer: sideBarData,
    });
  } else {
    res.render("error/noPermission");
  }
};

categoriesControllerObject.getCategoriesToDisplay = async (req, res) => {
  try {
    const dataFromDb = await pool.query(`select * from public.cim_categories`);
    res.status(200).send({
      allData: dataFromDb,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      msg: error,
    });
  }
};

categoriesControllerObject.editExistingCategory = async (req, res) => {
  let id = req.params.id;
  const { name, desc, status, sequence } = req.body;
  let resp;
  try {
    let uploadedImg;
    if (req.file) {
      uploadedImg = await uploadObject
        .uploadToS3(req.file.buffer)
        .then((res) => {
          return res;
        });
      const { Location } = uploadedImg;
      resp = await pool.query(
        categoriesModel.editExistingCategoryQuery(
          id,
          name,
          desc,
          sequence,
          status,
          Location
        )
      );
    } else {
      resp = await pool.query(
        categoriesModel.editExistingCategoryQuery(
          id,
          name,
          desc,
          sequence,
          status
        )
      );
    }
    // console.log(resp)
    res.status(200).send({
      updatedData: resp,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: error,
    });
  }
};


categoriesControllerObject.getSingleCategoryToDisplay = async (req, res) => {
  let id = req.params.id;
  try {
    let resp = await pool.query(
      categoriesModel.getSingleCategoryQuery(id)
    );
    res.status(200).send({
      allData: resp.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: error,
    });
  }
};


module.exports = categoriesControllerObject;
