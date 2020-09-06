import { schema } from 'nexus';

schema.objectType({
  name: 'Post',
  definition(t) {
    t.int('id')
    t.string('title')
    t.string('body')
    t.boolean('published')
  },
});

schema.extendType({
  type: 'Query',
  definition(t) {
    t.field('drafts', {
      type: 'Post',
      nullable: false,
      list: true,
      resolve(_root, _args, ctx) {
        return ctx.db.post.findMany({ where: { published: false } })
      }
    })
    t.field('posts', {
      type: 'Post',
      list: true,
      resolve(_root, _args, ctx) {
        return ctx.db.post.findMany({ where: { published: true } })
      }
    })
  }
});

schema.extendType({
  type: 'Mutation',
  definition(t) {
    t.field('createDraft', {
      type: 'Post',
      args: {
        title: schema.stringArg({ required: true }),
        body: schema.stringArg({ required: true })
      },
      nullable: false,
      resolve(_root, args, ctx) {
        const draft = {
          title: args.title,
          body: args.body,
          published: false,
        };
        return ctx.db.post.create({ data: draft });
      }
    })
    t.field('publish', {
      type: 'Post',
      args: {
        draftId: schema.intArg({ required: true })
      },
      resolve(_root, args, ctx) {
        return ctx.db.post.update({
          where: { id: args.draftId },
          data: {
            published: true
          }
        });
      }

    })
  }
})