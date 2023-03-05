const Author = require("../models/author");
const Book = require("../models/book");
const { body, validationResult } = require("express-validator");

// Display list of all Authors.
exports.author_list = function (req, res, next) {
  Author.find()
    .sort([["family_name", "ascending"]])
    .exec()
    .then(function (list_authors) {
      //Successful, so render
      res.render("author_list", {
        title: "Author List",
        author_list: list_authors,
      });
    })
    .catch((err) => {
      return next(err);
    });
};

// Display detail page for a specific Author.
exports.author_detail = (req, res, next) => {
  Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, "title summary").exec(),
  ])
    .then((results) => {
      if (results[0] == null) {
        // No results.
        const err = new Error("Author not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("author_detail", {
        title: "Author Detail",
        author: results[0],
        author_books: results[1],
      });
    })
    .catch((err) => {
      return next(err);
    });
};

// Display Author create form on GET.
exports.author_create_get = (req, res, next) => {
  res.render("author_form", { title: "Create Author" });
};

// Handle Author create on POST.
exports.author_create_post = [
  // Validate and sanitize fields.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .isAlphanumeric()
    .withMessage("First name has non-alphanumeric characters."),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render("author_form", {
        title: "Create Author",
        author: req.body,
        errors: errors.array(),
      });
      return;
    }
    // Data from form is valid.

    // Create an Author object with escaped and trimmed data.
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
    });
    author
      .save()
      .then(() => {
        res.redirect(author.url);
      })
      .catch((err) => {
        return next(err);
      });
  },
];

// Display Author delete form on GET.
exports.author_delete_get = (req, res, next) => {
  Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }).exec(),
  ])
    .then((results) => {
      if (results[0] == null) {
        // No results.
        res.redirect("/catalog/authors");
      }
      // Successful, so render.
      res.render("author_delete", {
        title: "Delete Author",
        author: results[0],
        author_books: results[1],
      });
    })
    .catch((err) => {
      return next(err);
    });
};

// Handle Author delete on POST.
exports.author_delete_post = (req, res, next) => {
  Promise.all([
    Author.findById(req.body.authorid).exec(),
    Book.find({ author: req.body.authorid }).exec(),
  ]).then(results=>{
    if (results[1].length > 0) {
      // Author has books. Render in same way as for GET route.
      res.render("author_delete", {
        title: "Delete Author",
        author: results[0],
        author_books: results[1],
      });
      return;
    }
    // Author has no books. Delete object and redirect to the list of authors.
    Author.findByIdAndRemove(req.body.authorid).then(()=>{
      // Success - go to author list
      res.redirect("/catalog/authors");
    }).catch(err=>{
      return next(err);
    })
  }).catch(err=>{
    return next(err);
  });

};

// Display Author update form on GET.
exports.author_update_get = (req, res,next) => {
   // Get book, authors and genres for form.
Author.findById(req.params.id).exec().then(result=>{
      if (result == null) {
        // No results.
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      // Success.
      // Mark our selected genres as checked.

      res.render("author_form", {
        title: "Update Author",
        author: result,
      });
    }).catch(err=>{
      return next(err);
    });
};

// Handle Author update on POST.
exports.author_update_post = [
  // Validate and sanitize fields.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .isAlphanumeric()
    .withMessage("First name has non-alphanumeric characters."),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render("author_form", {
        title: "Create Author",
        author: req.body,
        errors: errors.array(),
      });
      return;
    }
    // Data from form is valid.

    // Create an Author object with escaped and trimmed data.
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id:req.params.id,
    });

    Author
      .findByIdAndUpdate(req.params.id,author,{})
      .then(() => {
        res.redirect(author.url);
      })
      .catch((err) => {
        return next(err);
      });
  },
];
