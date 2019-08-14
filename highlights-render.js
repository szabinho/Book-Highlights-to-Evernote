function scrapeHighlights(sp_docToScrape) {
    var reformatedJSON;

    if (sp_docToScrape.querySelector('.bodyContainer')) {
        reformatedJSON = sp_KindleScraper.getHighlights(sp_docToScrape);
    }
    else {
        reformatedJSON = sp_IbookScraper.getHighlights(sp_docToScrape);
    } 

    // Templating and dom manipulation

    var sp_navHTML = '';
    var sectionHTML = '',
    sp_sectionEl = document.createElement('article');
    sp_sectionEl.classList.add('sp_highlights');

    reformatedJSON.sections.forEach((section, curr) => {
        sp_navHTML += `<li id="#sp_section${curr+1}-toc">${section.sectionTitle}&nbsp;(${section.noteCount})</li>`;
        
        sectionHTML += `<section class="sp_section" id="sp_section${curr+1}">`;
        sectionHTML += `<h2 class="sp_section-title">${section.sectionTitle} (${section.noteCount})</h2>`;

        section.notes.forEach((note) => {
            var noteHTML = 
            `<p class="sp_note sp_note--${note.level} sp_note--${note.type}">
            <span class="sp_note-level">&bull;</span> ${note.text}
            <span class="sp_note-location">&mdash;Location: <span class="sp_note-location__value">${note.location}</span></span>
            </p>`;
            sectionHTML += noteHTML;
        });
        sectionHTML += '</section>';
    });

    var sp_header = document.createElement('header');
    sp_header.innerHTML = '<h1 class="sp_title"></h1><p class="sp_author"></p><ol class="sp_toc"></ol>';
    sp_header.querySelector('.sp_title').innerText = reformatedJSON.title; 
    sp_header.querySelector('.sp_author').innerText = 'By: ' + reformatedJSON.authors + ' - Excerpts from: ' + reformatedJSON.source;
    sp_header.querySelector('.sp_toc').innerHTML = sp_navHTML;
    sp_sectionEl.innerHTML = sectionHTML;

    sp_sectionEl.insertBefore(sp_header, sp_sectionEl.firstChild);
    document.querySelector('body').append(sp_sectionEl);

    var newDocTitle = 'Highlights from: ' + reformatedJSON.title + ' - ' + reformatedJSON.authors;
    document.title = newDocTitle;
}