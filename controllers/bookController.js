const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");
const { body, validationResult } = require("express-validator");

const async = require("async");

exports.index = (req, res) => {
  Promise.all([     
    Book.countDocuments({}), 
    BookInstance.countDocuments({}),
    BookInstance.countDocuments({ status: "Available" }),
    Author.countDocuments({}),
    Genre.countDocuments({})]).then(
    (results) => {
      res.render("index", {
        title: "Local Library Home",
        data: results,
      })}).catch(err=>{
        console.log(err);
        res.render("index",{
          title:"Local Library Home",
          error:err,
        })
      })
};

// Display list of all books.
exports.book_list = function (req, res, next) {
  Book.find({}, "title author")
    .sort({ title: 1 })
    .populate("author")
    .exec().then(function (list_books) {
      //Successful, so render
      res.render("book_list", { title: "Book List", book_list: list_books });
    }).catch(err=>{
      return next(err);
    });
};


// Display detail page for a specific book.
exports.book_detail = (req, res, next) => {
  Promise.all([Book.findById(req.params.id)
    .populate("author")
    .populate("genre")
    .exec(),
    BookInstance.find({ book: req.params.id }).exec()])
    .then(results=>{
      if (results[0] == null) {
        // No results.
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("book_detail", {
        title: results[0].title,
        book: results[0],
        book_instances: results[1],
      });
    }).catch(err=> {
      return next(err);
    })
};

// Display book create form on GET.
exports.book_create_get = (req, res, next) => {
  // Get all authors and genres, which we can use for adding to our book.
  Promise.all([Author.find(),Genre.find()]).then((results)=>{
    res.render("book_form", {
      title: "Create Book",
      authors: results[0],
      genres: results[1],
    })
  }).catch(err=>{
    return next(err);
  })
};


// Handle book create on POST.
exports.book_create_post = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre =
        typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped and trimmed data.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      Promise.all([Author.find(),Genre.find()]).then(results=>{
        for (const genre of results[1]) {
          if (book.genre.includes(genre._id)) {
            genre.checked = "true";
          }
        }
        res.render("book_form", {
          title: "Create Book",
          authors: results[0],
          genres: results[1],
          book,
          errors: errors.array(),
        })
      }).catch(err=>{
        return next(err);
      })
      return;
    }

    // Data from form is valid. Save book.
    book.save().then(()=>{
      res.redirect(book.url);
    }).catch((err) => {
        return next(err);
    });
  },
];


// Display book delete form on GET.
exports.book_delete_get = (req, res, next) => {
  Promise.all([
    Book.findById(req.params.id).exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ])
    .then((results) => {
      if (results[1] == null) {
        // No results.
        res.redirect("/catalog/books");
      }
      // Successful, so render.
      res.render("book_delete", {
        title: "Delete Book",
        book: results[0],
        book_instances: results[1],
      });
    })
    .catch((err) => {
      return next(err);
    });
};

// Handle book delete on POST.
exports.book_delete_post = (req, res, next) => {
  Promise.all([
    Book.findById(req.body.bookid).exec(),
    BookInstance.find({ book: req.body.bookid }).exec(),
  ]).then(results=>{
    if (results[1].length > 0) {
      res.render("book_delete", {
        title: "Delete Book",
        book: results[0],
        book_instances: results[1],
      });
      return;
    }
    // Author has no books. Delete object and redirect to the list of authors.
    Book.findByIdAndRemove(req.body.bookid).then(()=>{
      // Success - go to author list
      res.redirect("/catalog/books");
    }).catch(err=>{
      return next(err);
    })
  }).catch(err=>{
    return next(err);
  });

};
// Display book update form on GET.
exports.book_update_get = (req, res, next) => {
  // Get book, authors and genres for form.
  Promise.all([Book.findById(req.params.id)
    .populate("author")
    .populate("genre")
    .exec(),Author.find().exec(),Genre.find().exec()]).then(results=>{
      if (results[0] == null) {
        // No results.
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      // Success.
      // Mark our selected genres as checked.
      for (const genre of results[2]) {
        for (const bookGenre of results[0].genre) {
          if (genre._id.toString() === bookGenre._id.toString()) {
            genre.checked = "true";
          }
        }
      }
      res.render("book_form", {
        title: "Update Book",
        authors: results[1],
        genres: results[2],
        book: results[0],
      });
    }).catch(err=>{
      return next(err);
    });
};


// Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre =
        typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      Promise.all([Author.find(),Genre.find()]).then(results=>{
        // Mark our selected genres as checked.
        for (const genre of results[1]) {
          if (book.genre.includes(genre._id)) {
            genre.checked = "true";
          }
        }
        res.render("book_form", {
          title: "Update Book",
          authors: results[0],
          genres: results[1],
          book,
          errors: errors.array(),
        });
      }).catch(err=>{
        return next(err);
      })

      return;
    }

    // Data from form is valid. Update the record.
    Book.findByIdAndUpdate(req.params.id, book, {}).then(( thebook) => {
      // Successful: redirect to book detail page.
      res.redirect(thebook.url);
    }).catch(err=>{
      return next(err);
    });
  },
];
