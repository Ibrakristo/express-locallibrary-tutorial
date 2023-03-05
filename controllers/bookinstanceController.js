const BookInstance = require("../models/bookinstance");
const { body, validationResult } = require("express-validator");
const Book = require("../models/book");

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, next) {
  BookInstance.find()
    .populate('book').sort('book')
    .exec().then(function (list_bookinstances) {
      // Successful, so render
      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    },err=>{
      if (err) {
        return next(err);
      }
    });
};


// Display detail page for a specific BookInstance.
exports.bookinstance_detail = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec().then((bookinstance)=>{
      if (bookinstance == null) {
        // No results.
        const err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance_detail", {
        title: `Copy: ${bookinstance.book.title}`,
        bookinstance,
      })}).catch(err=>{
        return next(err);
      });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = (req, res, next) => {
  Book.find({}, "title").exec().then(books=>{
    res.render("bookinstance_form", {
      title: "Create BookInstance",
      book_list: books,
    });
  }).catch(err=>{
    return next(err);
  })
};


// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, "title").exec().then(books=>{
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance,
        })
      }).catch(err=>{
        return next(err);
      })
      return;
    }

    // Data from form is valid.
    bookinstance.save().then(()=>{
      res.redirect(bookinstance.url);
    }).catch(err=>{
      return next(err);
    })
  },
];


// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = (req, res, next) => {
    BookInstance.findById(req.params.id).populate("book").exec()
    .then((result) => {
      if (result == null) {
        // No results.
        res.redirect("/catalog/bookinstances");
      }
      // Successful, so render.
      res.render("bookinstance_delete", {
        title: "Delete BookInstance",
        bookinstance: result,
      });
    })
    .catch((err) => {
      return next(err);
    });
};
// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = (req, res, next) => {
    BookInstance.findById(req.body.bookinstanceid).exec()
    .then(result=>{
    BookInstance.findByIdAndRemove(req.body.bookinstanceid).then(()=>{
      res.redirect("/catalog/bookinstances");
    }).catch(err=>{
      return next(err);
    })
  }).catch(err=>{
    return next(err);
  });

};
// Display BookInstance update form on GET.
exports.bookinstance_update_get = (req, res, next) => {
  // Get book, authors and genres for form.
  Promise.all([Book.find({},"title")
    .exec(),BookInstance.findById(req.params.id).populate("book").exec()]).then(results=>{
      if (results[1] == null) {
        // No results.
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      
      // Success.
      // Mark our selected genres as checked.
      console.log(results[1].due_back_forInput)
      res.render("bookinstance_form", {
        title: "Update BookInstance",
        book_list:results[0],
        selected_book:results[1].book._id,
        bookinstance:results[1],
      });
    }).catch(err=>{
      return next(err);
    });
};


// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id:req.params.id,
    });
    
    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, "title").exec().then(books=>{
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance,
        })
      }).catch(err=>{
        return next(err);
      })
      return;
    }

    // Data from form is valid.
    BookInstance.findByIdAndUpdate(req.params.id,bookinstance,{}).then(()=>{
      res.redirect(bookinstance.url);
    }).catch(err=>{
      return next(err);
    })
  },
];